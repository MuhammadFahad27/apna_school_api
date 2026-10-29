import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import {
  ArchiveFarmDto,
  CreateFarmOwnerDto,
  SuspendFarmDto,
  UpdateEmployeeStatusDto,
} from './dto/index.js';
import { MailService } from '../mail/mail.service.js';
import { Employee } from './employee.entity.js';
import { Farm, FarmStatus } from './farm.entity.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

@Injectable()
export class FarmsService {
  private readonly logger = new Logger(FarmsService.name);

  constructor(
    @InjectRepository(Farm) private readonly farms: Repository<Farm>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  /**
   * List all farm owners / organizations with search, status filter, and pagination
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }) {
    const page = Math.max(Number(options?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(options?.limit) || 8, 1), 100);
    const skip = (page - 1) * limit;

    const query = this.farms
      .createQueryBuilder('farm')
      .leftJoinAndSelect('farm.owner', 'owner')
      .skip(skip)
      .take(limit);

    // Filter by status if provided
    if (options?.status && options.status !== 'all') {
      query.andWhere('farm.status = :status', { status: options.status });
    }

    // Filter by search query
    if (options?.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(farm.name) LIKE :q OR LOWER(farm.location) LIKE :q OR LOWER(owner.name) LIKE :q OR LOWER(owner.phone) LIKE :q OR LOWER(owner.email) LIKE :q)',
        { q },
      );
    }

    // Sorting
    const sortField = options?.sort || 'createdAt';
    const sortOrder = options?.order || 'DESC';
    if (sortField === 'name') {
      query.orderBy('farm.name', sortOrder);
    } else {
      query.orderBy('farm.createdAt', sortOrder);
    }

    const [items, total] = await query.getManyAndCount();

    // Fetch employee counts for current page of farms in one aggregate query
    const farmIds = items.map((f: Farm) => f.id);
    const employeeCounts: Record<string, number> = {};
    if (farmIds.length > 0) {
      const counts = await this.employees
        .createQueryBuilder('employee')
        .select('employee.farmId', 'farmId')
        .addSelect('COUNT(employee.id)', 'count')
        .where('employee.farmId IN (:...farmIds)', { farmIds })
        .groupBy('employee.farmId')
        .getRawMany<{ farmId: string; count: string }>();

      for (const row of counts) {
        employeeCounts[row.farmId] = parseInt(row.count, 10) || 0;
      }
    }

    return {
      items: items.map((f: Farm) => ({
        id: f.id,
        name: f.name,
        location: f.location,
        status: f.status,
        suspensionReason: f.suspensionReason,
        maxCattle: f.maxCattle,
        maxStaff: f.maxStaff,
        createdAt: f.createdAt,
        owner: f.owner
          ? {
              id: f.owner.id,
              name: f.owner.name,
              phone: f.owner.phone,
              email: f.owner.email,
              status: f.owner.status,
            }
          : null,
        employeeCount: employeeCounts[f.id] ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Detail view of a farm and its owner profile (strictly organization level)
   */
  async findOne(id: string) {
    const farm = await this.farms.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID "${id}" was not found.`);
    }

    const [employees, employeeCount] = await this.employees.findAndCount({
      where: { farmId: id },
      order: { createdAt: 'DESC' },
    });

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        location: farm.location,
        status: farm.status,
        suspensionReason: farm.suspensionReason,
        maxCattle: farm.maxCattle,
        maxStaff: farm.maxStaff,
        createdAt: farm.createdAt,
        updatedAt: farm.updatedAt,
      },
      owner: farm.owner
        ? {
            id: farm.owner.id,
            name: farm.owner.name,
            phone: farm.owner.phone,
            email: farm.owner.email,
            status: farm.owner.status,
            suspensionReason: farm.owner.suspensionReason,
            createdAt: farm.owner.createdAt,
          }
        : null,
      employeeCount,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        phone: e.phone,
        isActive: e.isActive,
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * Create Farm Owner + Farm in a single atomic database transaction
   */
  async createOwner(dto: CreateFarmOwnerDto) {
    const normalizedPhone = dto.phone.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email address is required.');
    }
    const ownerName = dto.ownerName.trim();
    const farmName = dto.farmName.trim();
    const location = dto.location.trim();

    // 1. Phone number must be unique platform-wide (neither owner nor staff duplicate)
    const existingUserPhone = await this.users.findOne({
      where: { phone: normalizedPhone },
    });
    if (existingUserPhone) {
      throw new ConflictException(
        `A user account with phone "${normalizedPhone}" already exists.`,
      );
    }

    const existingEmployeePhone = await this.employees.findOne({
      where: { phone: normalizedPhone },
    });
    if (existingEmployeePhone) {
      throw new ConflictException(
        `A staff member with phone "${normalizedPhone}" is already registered on the platform.`,
      );
    }

    // 2. Email uniqueness check (Email is required)
    const existingUserEmail = await this.users.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUserEmail) {
      throw new ConflictException(
        `A user with email "${normalizedEmail}" already exists.`,
      );
    }

    // 3. Generate secure temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // 4. Execute atomic database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdUser: User;
    let createdFarm: Farm;

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const farmRepo = queryRunner.manager.getRepository(Farm);

      createdUser = await userRepo.save(
        userRepo.create({
          name: ownerName,
          phone: normalizedPhone,
          email: normalizedEmail,
          passwordHash,
          role: UserRole.FARM_OWNER,
          status: UserStatus.ACTIVE,
          isActive: true,
        }),
      );

      createdFarm = await farmRepo.save(
        farmRepo.create({
          name: farmName,
          location,
          ownerId: createdUser.id,
          status: FarmStatus.ACTIVE,
          maxCattle: 500,
          maxStaff: 50,
        }),
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create farm and owner in transaction:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // 5. Send invitation email if email was provided (non-blocking)
    if (normalizedEmail) {
      this.mailService
        .sendFarmOwnerInvitation(
          normalizedEmail,
          ownerName,
          normalizedPhone,
          temporaryPassword,
        )
        .catch((err) => {
          this.logger.warn(`Could not send invitation email: ${err.message}`);
        });
    }

    // 6. Return temporary password ONCE to admin so they can convey it directly
    return {
      farm: {
        id: createdFarm.id,
        name: createdFarm.name,
        location: createdFarm.location,
        status: createdFarm.status,
      },
      owner: {
        id: createdUser.id,
        name: createdUser.name,
        phone: createdUser.phone,
        email: createdUser.email,
        status: createdUser.status,
      },
      temporaryPassword,
    };
  }

  /**
   * Suspend a farm and its owner (Reason is strictly mandatory!)
   */
  async suspend(id: string, dto: SuspendFarmDto) {
    const farm = await this.farms.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID "${id}" was not found.`);
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Suspension reason is strictly required.');
    }

    const reason = dto.reason.trim();
    farm.status = FarmStatus.INACTIVE;
    farm.suspensionReason = reason;
    await this.farms.save(farm);

    if (farm.owner) {
      farm.owner.status = UserStatus.INACTIVE;
      farm.owner.isActive = false;
      farm.owner.suspensionReason = reason;
      await this.users.save(farm.owner);
    }

    this.logger.log(`Farm "${farm.name}" (${farm.id}) suspended. Reason: ${reason}`);

    return {
      id: farm.id,
      name: farm.name,
      status: farm.status,
      suspensionReason: farm.suspensionReason,
    };
  }

  /**
   * Reactivate a suspended farm and its owner
   */
  async reactivate(id: string) {
    const farm = await this.farms.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID "${id}" was not found.`);
    }

    farm.status = FarmStatus.ACTIVE;
    farm.suspensionReason = null;
    await this.farms.save(farm);

    if (farm.owner) {
      farm.owner.status = UserStatus.ACTIVE;
      farm.owner.isActive = true;
      farm.owner.suspensionReason = null;
      await this.users.save(farm.owner);
    }

    this.logger.log(`Farm "${farm.name}" (${farm.id}) reactivated.`);

    return {
      id: farm.id,
      name: farm.name,
      status: farm.status,
    };
  }

  /**
   * Reset Owner's password: generates new temporary password and returns it ONCE to admin
   */
  async resetOwnerPassword(farmId: string) {
    const farm = await this.farms.findOne({
      where: { id: farmId },
      relations: { owner: true },
    });

    if (!farm || !farm.owner) {
      throw new NotFoundException(`Farm or owner for ID "${farmId}" was not found.`);
    }

    const newTemporaryPassword = this.generateTemporaryPassword();
    farm.owner.passwordHash = await bcrypt.hash(newTemporaryPassword, 12);
    await this.users.save(farm.owner);

    if (farm.owner.email) {
      this.mailService
        .sendPasswordReset(
          farm.owner.email,
          farm.owner.name || farm.name,
          newTemporaryPassword,
        )
        .catch((err) => {
          this.logger.warn(`Could not send password reset email: ${err.message}`);
        });
    }

    this.logger.log(`Password reset for farm owner of "${farm.name}".`);

    return {
      ownerName: farm.owner.name,
      phone: farm.owner.phone,
      email: farm.owner.email,
      temporaryPassword: newTemporaryPassword,
    };
  }

  /**
   * Soft delete / Archive a farm: requires confirmation of the farm name
   */
  async archive(id: string, dto: ArchiveFarmDto) {
    const farm = await this.farms.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID "${id}" was not found.`);
    }

    if (
      !dto.farmNameConfirmation ||
      dto.farmNameConfirmation.trim().toLowerCase() !== farm.name.trim().toLowerCase()
    ) {
      throw new BadRequestException(
        `Confirmation mismatch. Please type the exact farm name "${farm.name}" to archive.`,
      );
    }

    farm.status = FarmStatus.INACTIVE;
    farm.suspensionReason = farm.suspensionReason || 'Account archived';
    await this.farms.save(farm);

    if (farm.owner) {
      farm.owner.status = UserStatus.INACTIVE;
      farm.owner.isActive = false;
      farm.owner.suspensionReason = farm.owner.suspensionReason || 'Account archived';
      await this.users.save(farm.owner);
    }

    this.logger.log(`Farm "${farm.name}" (${farm.id}) has been set to inactive (archived).`);

    return {
      id: farm.id,
      name: farm.name,
      status: farm.status,
      message: 'Farm and owner account have been set to inactive. Data remains preserved.',
    };
  }

  /**
   * View employees belonging strictly to this farm
   */
  async employeesForFarm(farmId: string) {
    const farm = await this.farms.findOne({ where: { id: farmId } });
    if (!farm) {
      throw new NotFoundException(`Farm with ID "${farmId}" was not found.`);
    }

    return this.employees.find({
      where: { farmId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Staff Account Block / Activate / Deactivate (Strict ID check prevents cross-farm tampering)
   */
  async updateEmployeeStatus(
    farmId: string,
    employeeId: string,
    dto: UpdateEmployeeStatusDto,
  ) {
    const employee = await this.employees.findOne({
      where: { id: employeeId, farmId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Staff member with ID "${employeeId}" belonging to farm "${farmId}" was not found.`,
      );
    }

    employee.isActive = dto.isActive;
    const updated = await this.employees.save(employee);

    this.logger.log(
      `Staff "${employee.name}" (${employee.id}) status set to ${dto.isActive ? 'Active' : 'Inactive'}`,
    );

    return updated;
  }

  private generateTemporaryPassword(): string {
    return `FD-${crypto.randomBytes(4).toString('hex').toUpperCase()}!`;
  }
}

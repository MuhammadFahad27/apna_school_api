import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import {
  CreateEmployeeDto,
  ResetEmployeePasswordDto,
  UpdateEmployeeDto,
} from './dto/index.js';
import type { AuthUser } from '../auth/auth.types.js';
import { DutyShift, Employee, EmployeeRole } from '../farms/employee.entity.js';
import { Farm, FarmStatus } from '../farms/farm.entity.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Farm)
    private readonly farms: Repository<Farm>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List employees with search, role filter, status filter, and pagination
   * Strictly scopes to the owner's farm unless requester is admin
   */
  async findAll(
    currentUser: AuthUser,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      status?: string;
      farmId?: string;
    },
  ) {
    const page = Math.max(Number(options?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(options?.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const query = this.employees
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.farm', 'farm')
      .skip(skip)
      .take(limit);

    // Multi-tenant boundary: enforce farm scoping
    if (currentUser.role !== UserRole.ADMIN) {
      if (!currentUser.farmId) {
        throw new ForbiddenException(
          'You are not associated with any dairy farm.',
        );
      }
      query.andWhere('employee.farmId = :farmId', {
        farmId: currentUser.farmId,
      });
    } else if (options?.farmId) {
      query.andWhere('employee.farmId = :farmId', {
        farmId: options.farmId,
      });
    }

    // Role filter
    if (options?.role && options.role !== 'all') {
      query.andWhere('employee.role = :role', { role: options.role });
    }

    // Status filter (active / inactive)
    if (options?.status && options.status !== 'all') {
      const isActive = options.status === 'active';
      query.andWhere('employee.isActive = :isActive', { isActive });
    }

    // Search filter
    if (options?.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(employee.name) LIKE :q OR LOWER(employee.phone) LIKE :q OR LOWER(employee.emergencyContact) LIKE :q)',
        { q },
      );
    }

    query.orderBy('employee.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    // Mask salary if user is worker or manager
    const canSeeSalary =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.FARM_OWNER;

    return {
      items: items.map((emp) => ({
        id: emp.id,
        farmId: emp.farmId,
        farmName: emp.farm?.name,
        name: emp.name,
        phone: emp.phone,
        role: emp.role,
        dutyShift: emp.dutyShift,
        joiningDate: emp.joiningDate,
        baseSalary: canSeeSalary ? Number(emp.baseSalary) : null,
        photoUrl: emp.photoUrl,
        emergencyContact: emp.emergencyContact,
        cnic: emp.cnic,
        isActive: emp.isActive,
        deactivationReason: emp.deactivationReason,
        lastLoginAt: emp.lastLoginAt,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Detail view of a single employee
   */
  async findOne(currentUser: AuthUser, id: string) {
    const employee = await this.employees.findOne({
      where: { id },
      relations: { farm: true },
    });

    if (!employee) {
      throw new NotFoundException(`Staff member with ID "${id}" was not found.`);
    }

    // Multi-tenant farm isolation check
    if (
      currentUser.role !== UserRole.ADMIN &&
      employee.farmId !== currentUser.farmId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view staff from another farm.',
      );
    }

    const canSeeSalary =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.FARM_OWNER;

    return {
      id: employee.id,
      farmId: employee.farmId,
      farmName: employee.farm?.name,
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      dutyShift: employee.dutyShift,
      joiningDate: employee.joiningDate,
      baseSalary: canSeeSalary ? Number(employee.baseSalary) : null,
      photoUrl: employee.photoUrl,
      emergencyContact: employee.emergencyContact,
      cnic: employee.cnic,
      isActive: employee.isActive,
      deactivationReason: employee.deactivationReason,
      lastLoginAt: employee.lastLoginAt,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  /**
   * Create new employee & user account in single atomic transaction
   */
  async create(currentUser: AuthUser, dto: CreateEmployeeDto) {
    const farmId =
      currentUser.role === UserRole.FARM_OWNER
        ? currentUser.farmId
        : dto.farmId || currentUser.farmId;

    if (!farmId) {
      throw new BadRequestException('Target farm ID is required.');
    }

    const farm = await this.farms.findOne({ where: { id: farmId } });
    if (!farm) {
      throw new NotFoundException(`Farm with ID "${farmId}" was not found.`);
    }

    if (farm.status === FarmStatus.INACTIVE) {
      throw new BadRequestException(
        'Cannot enroll staff for an inactive dairy farm organization.',
      );
    }

    // Capacity limit check
    const currentStaffCount = await this.employees.count({ where: { farmId } });
    if (currentStaffCount >= farm.maxStaff) {
      throw new BadRequestException(
        `Staff limit for this farm (${farm.maxStaff} users) has been reached. Please contact admin to upgrade capacity.`,
      );
    }

    const normalizedPhone = dto.phone.trim();

    // Check unique phone across employees and users
    const existingEmployee = await this.employees.findOne({
      where: { phone: normalizedPhone },
    });
    if (existingEmployee) {
      throw new ConflictException(
        `Staff member with phone "${normalizedPhone}" already exists (${existingEmployee.name}).`,
      );
    }

    const existingUser = await this.users.findOne({
      where: { phone: normalizedPhone },
    });
    if (existingUser) {
      throw new ConflictException(
        `A platform user account with phone "${normalizedPhone}" already exists.`,
      );
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const userRole =
      dto.role === EmployeeRole.MANAGER ? UserRole.MANAGER : UserRole.WORKER;

    return this.dataSource.transaction(async (manager) => {
      // 1. Create linked User for authentication
      const user = manager.create(User, {
        name: dto.name.trim(),
        phone: normalizedPhone,
        email: null,
        passwordHash,
        role: userRole,
        isActive: true,
        status: UserStatus.ACTIVE,
      });
      const savedUser = await manager.save(User, user);

      // 2. Create Employee record
      const employee = manager.create(Employee, {
        farmId,
        userId: savedUser.id,
        name: dto.name.trim(),
        phone: normalizedPhone,
        role: dto.role,
        dutyShift: dto.dutyShift,
        joiningDate: dto.joiningDate,
        baseSalary: dto.baseSalary,
        photoUrl: dto.photoUrl,
        emergencyContact: dto.emergencyContact.trim(),
        cnic: dto.cnic?.trim() || null,
        isActive: true,
        mustChangePassword: true,
      });
      const savedEmployee = await manager.save(Employee, employee);

      this.logger.log(
        `Staff member "${savedEmployee.name}" (${savedEmployee.id}) created for farm "${farm.name}" by user ${currentUser.id}`,
      );

      return {
        employee: {
          id: savedEmployee.id,
          farmId: savedEmployee.farmId,
          farmName: farm.name,
          name: savedEmployee.name,
          phone: savedEmployee.phone,
          role: savedEmployee.role,
          dutyShift: savedEmployee.dutyShift,
          joiningDate: savedEmployee.joiningDate,
          baseSalary: Number(savedEmployee.baseSalary),
          photoUrl: savedEmployee.photoUrl,
          emergencyContact: savedEmployee.emergencyContact,
          cnic: savedEmployee.cnic,
          isActive: savedEmployee.isActive,
          createdAt: savedEmployee.createdAt,
        },
        temporaryPassword,
      };
    });
  }

  /**
   * Edit employee details and update linked user if needed
   */
  async update(currentUser: AuthUser, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.employees.findOne({
      where: { id },
      relations: { farm: true },
    });

    if (!employee) {
      throw new NotFoundException(`Staff member with ID "${id}" was not found.`);
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      employee.farmId !== currentUser.farmId
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify staff from another farm.',
      );
    }

    // Phone uniqueness check if phone is changing
    if (dto.phone && dto.phone.trim() !== employee.phone) {
      const normalizedPhone = dto.phone.trim();
      const existing = await this.employees.findOne({
        where: { phone: normalizedPhone },
      });
      if (existing && existing.id !== employee.id) {
        throw new ConflictException(
          `Phone number "${normalizedPhone}" is already assigned to another staff member.`,
        );
      }
      employee.phone = normalizedPhone;
    }

    if (dto.name) employee.name = dto.name.trim();
    if (dto.role) employee.role = dto.role;
    if (dto.dutyShift) employee.dutyShift = dto.dutyShift;
    if (dto.joiningDate !== undefined) employee.joiningDate = dto.joiningDate;
    if (dto.baseSalary !== undefined) employee.baseSalary = dto.baseSalary;
    if (dto.photoUrl) employee.photoUrl = dto.photoUrl;
    if (dto.emergencyContact)
      employee.emergencyContact = dto.emergencyContact.trim();
    if (dto.cnic !== undefined) employee.cnic = dto.cnic?.trim() || null;

    const saved = await this.employees.save(employee);

    // Sync changes to User entity if linked
    if (employee.userId) {
      const user = await this.users.findOne({ where: { id: employee.userId } });
      if (user) {
        if (dto.name) user.name = dto.name.trim();
        if (dto.phone) user.phone = dto.phone.trim();
        if (dto.role) {
          user.role =
            dto.role === EmployeeRole.MANAGER
              ? UserRole.MANAGER
              : UserRole.WORKER;
        }
        await this.users.save(user);
      }
    }

    this.logger.log(
      `Staff member "${saved.name}" (${saved.id}) updated by user ${currentUser.id}`,
    );

    return saved;
  }

  /**
   * Deactivate or reactivate an employee
   */
  async updateStatus(
    currentUser: AuthUser,
    id: string,
    isActive: boolean,
    reason?: string,
  ) {
    const employee = await this.employees.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Staff member with ID "${id}" was not found.`);
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      employee.farmId !== currentUser.farmId
    ) {
      throw new ForbiddenException(
        'You do not have permission to change status for staff from another farm.',
      );
    }

    employee.isActive = isActive;
    employee.deactivationReason = isActive
      ? null
      : reason?.trim() || 'Deactivated by farm management';

    await this.employees.save(employee);

    // Sync to User entity for immediate token invalidation
    if (employee.userId) {
      const user = await this.users.findOne({ where: { id: employee.userId } });
      if (user) {
        user.isActive = isActive;
        user.status = isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
        user.suspensionReason = employee.deactivationReason;
        await this.users.save(user);
      }
    }

    this.logger.log(
      `Staff member "${employee.name}" (${employee.id}) status set to ${isActive ? 'Active' : 'Inactive'} by ${currentUser.id}`,
    );

    return {
      id: employee.id,
      name: employee.name,
      isActive: employee.isActive,
      deactivationReason: employee.deactivationReason,
    };
  }

  /**
   * Reset staff password (generated or custom, displayed ONCE)
   */
  async resetPassword(
    currentUser: AuthUser,
    id: string,
    dto?: ResetEmployeePasswordDto,
  ) {
    const employee = await this.employees.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Staff member with ID "${id}" was not found.`);
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      employee.farmId !== currentUser.farmId
    ) {
      throw new ForbiddenException(
        'You do not have permission to reset password for staff from another farm.',
      );
    }

    const newPassword =
      dto?.password?.trim() || this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(newPassword, 12);

    if (employee.userId) {
      const user = await this.users.findOne({ where: { id: employee.userId } });
      if (user) {
        user.passwordHash = passwordHash;
        await this.users.save(user);
      }
    } else if (employee.phone) {
      // Find user by phone if userId was not linked
      const user = await this.users.findOne({
        where: { phone: employee.phone },
      });
      if (user) {
        user.passwordHash = passwordHash;
        employee.userId = user.id;
        await this.users.save(user);
        await this.employees.save(employee);
      }
    }

    employee.mustChangePassword = true;
    await this.employees.save(employee);

    this.logger.log(
      `Password reset for staff member "${employee.name}" (${employee.id}) by ${currentUser.id}`,
    );

    return {
      employeeId: employee.id,
      name: employee.name,
      phone: employee.phone,
      temporaryPassword: newPassword,
    };
  }

  private generateTemporaryPassword(): string {
    return `FD-EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}!`;
  }
}

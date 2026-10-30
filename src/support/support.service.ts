import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth.types.js';
import { Farm, FarmStatus } from '../farms/farm.entity.js';
import { MailService } from '../mail/mail.service.js';
import { UserRole } from '../users/user.entity.js';
import type { CreateSupportRequestDto, ReplySupportRequestDto } from './dto/index.js';
import { SupportPriority, SupportRequest, SupportStatus } from './support-request.entity.js';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportRequest)
    private readonly supportRepo: Repository<SupportRequest>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Owner submits a new support request
   */
  async create(ownerUser: AuthUser, dto: CreateSupportRequestDto) {
    const farm = await this.farmRepo.findOne({
      where: { ownerId: ownerUser.id },
      relations: { owner: true },
    });

    if (!farm) {
      throw new NotFoundException('No farm organization found for your account.');
    }

    if (farm.status === FarmStatus.INACTIVE) {
      throw new BadRequestException('Your farm organization is currently inactive.');
    }

    const ticketNumber = `FD-SR-${Date.now().toString().slice(-6)}`;

    const support = this.supportRepo.create({
      ticketNumber,
      farmId: farm.id,
      ownerId: ownerUser.id,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      priority: dto.priority || SupportPriority.MEDIUM,
      status: SupportStatus.OPEN,
    });

    const saved = await this.supportRepo.save(support);
    this.logger.log(`New support request ${ticketNumber} created by owner "${ownerUser.email || ownerUser.phone}" for farm "${farm.name}".`);

    return saved;
  }

  /**
   * Admin lists all support requests with optional status filter, search & pagination
   */
  async findAllForAdmin(options?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options?.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.supportRepo
      .createQueryBuilder('support')
      .leftJoinAndSelect('support.farm', 'farm')
      .leftJoinAndSelect('support.owner', 'owner')
      .leftJoinAndSelect('support.closedBy', 'closedBy')
      .orderBy('support.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (options?.status && options.status !== 'all') {
      qb.andWhere('support.status = :status', { status: options.status });
    }

    if (options?.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(support.ticketNumber) LIKE :q OR LOWER(support.subject) LIKE :q OR LOWER(support.message) LIKE :q OR LOWER(farm.name) LIKE :q OR LOWER(owner.name) LIKE :q OR LOWER(owner.email) LIKE :q OR LOWER(owner.phone) LIKE :q)',
        { q },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Owner views all support requests submitted for their farm
   */
  async findAllForOwner(ownerUser: AuthUser) {
    return this.supportRepo.find({
      where: { ownerId: ownerUser.id },
      relations: { farm: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get single support request details
   */
  async findOne(id: string, user: AuthUser) {
    const ticket = await this.supportRepo.findOne({
      where: { id },
      relations: { farm: true, owner: true, closedBy: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Support request with ID "${id}" was not found.`);
    }

    if (user.role !== UserRole.ADMIN && ticket.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this support request.');
    }

    return ticket;
  }

  /**
   * Admin writes a reply message to the owner.
   * This sends an email directly to the farm owner's email address.
   * Rule: If request is closed, no changes or replies are allowed.
   */
  async replyAsAdmin(id: string, adminUser: AuthUser, dto: ReplySupportRequestDto) {
    const ticket = await this.supportRepo.findOne({
      where: { id },
      relations: { farm: true, owner: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Support request with ID "${id}" was not found.`);
    }

    if (ticket.status === SupportStatus.CLOSED) {
      throw new BadRequestException(
        'This support request has been closed and locked. No further replies or modifications can be made.',
      );
    }

    ticket.adminResponse = dto.responseMessage.trim();
    ticket.respondedAt = new Date();

    const saved = await this.supportRepo.save(ticket);

    // Send email to the farm owner
    if (ticket.owner?.email) {
      this.mailService
        .sendSupportReply(
          ticket.owner.email,
          ticket.owner.name || 'Farm Owner',
          ticket.farm?.name || 'Your Farm',
          ticket.ticketNumber,
          ticket.subject,
          dto.responseMessage.trim(),
        )
        .catch((err) => {
          this.logger.warn(`Could not deliver support reply email: ${err.message}`);
        });
    }

    this.logger.log(`Admin ${adminUser.id} replied to support ticket ${ticket.ticketNumber}.`);

    return saved;
  }

  /**
   * Admin permanently closes the support request.
   * Once closed, neither admin nor owner can modify or reopen it.
   */
  async closeAsAdmin(id: string, adminUser: AuthUser) {
    const ticket = await this.supportRepo.findOne({
      where: { id },
      relations: { farm: true, owner: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Support request with ID "${id}" was not found.`);
    }

    if (ticket.status === SupportStatus.CLOSED) {
      throw new BadRequestException('This support request is already closed.');
    }

    ticket.status = SupportStatus.CLOSED;
    ticket.closedAt = new Date();
    ticket.closedById = adminUser.id;

    const saved = await this.supportRepo.save(ticket);
    this.logger.log(`Support ticket ${ticket.ticketNumber} permanently closed by admin ${adminUser.id}.`);

    return saved;
  }
}

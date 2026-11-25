import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Repository } from 'typeorm';
import { School, SchoolStatus, SubscriptionPlan } from './entities/school.entity.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { MailService } from '../mail/mail.service.js';
import { CreateSchoolDto } from './dto/create-school.dto.js';
import { UpdateSchoolDto } from './dto/update-school.dto.js';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateSchoolDto) {
    const code = dto.code.trim().toUpperCase();
    const slug = (dto.slug || dto.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check code / slug conflict
    const existingCode = await this.schoolRepo.findOne({
      where: [{ code }, { slug }],
    });
    if (existingCode) {
      throw new ConflictException(
        `A school with code '${code}' or slug '${slug}' already exists.`,
      );
    }

    // Check owner email/phone conflict
    const ownerEmail = dto.owner_email.trim().toLowerCase();
    const ownerPhone = dto.owner_phone.trim();

    const existingUser = await this.userRepo.findOne({
      where: [{ email: ownerEmail }, { phone: ownerPhone }],
    });
    if (existingUser) {
      throw new ConflictException(
        `A user with email '${ownerEmail}' or phone '${ownerPhone}' already exists.`,
      );
    }

    // Auto-generate password if not given
    const rawPassword =
      dto.owner_password?.trim() ||
      `Pass@${crypto.randomBytes(3).toString('hex').toUpperCase()}!`;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // 1. Create School
    const school = this.schoolRepo.create({
      name: dto.name.trim(),
      code,
      slug,
      address: dto.address?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim()?.toLowerCase() || null,
      website: dto.website?.trim() || null,
      logo_url: dto.logo_url?.trim() || null,
      theme_color: dto.theme_color?.trim() || '#0c3a2b',
      plan: dto.plan || SubscriptionPlan.STANDARD,
      status: SchoolStatus.ACTIVE,
      max_students: dto.max_students || 500,
      max_teachers: dto.max_teachers || 50,
      notes: dto.notes?.trim() || null,
    });
    const savedSchool = await this.schoolRepo.save(school);

    // 2. Create Owner (School Admin) User
    const ownerUser = this.userRepo.create({
      name: dto.owner_name.trim(),
      email: ownerEmail,
      phone: ownerPhone,
      passwordHash,
      role: UserRole.ADMIN,
      school_id: savedSchool.id,
      isActive: true,
      status: UserStatus.ACTIVE,
    });
    const savedOwner = await this.userRepo.save(ownerUser);

    // 3. Send Credentials via Mail
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/login`;

    try {
      await this.mailService.sendSchoolWelcomeEmail({
        email: ownerEmail,
        ownerName: dto.owner_name,
        schoolName: savedSchool.name,
        loginUrl,
        password: rawPassword,
      });
    } catch (err) {
      // Non-fatal, credentials still returned in response
      console.error('Failed to send welcome email:', err);
    }

    return {
      message: `School '${savedSchool.name}' created successfully.`,
      school: savedSchool,
      owner: {
        id: savedOwner.id,
        name: savedOwner.name,
        email: savedOwner.email,
        phone: savedOwner.phone,
        role: savedOwner.role,
        generatedPassword: rawPassword,
      },
    };
  }

  async findAll(params: {
    search?: string;
    status?: string;
    plan?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query = this.schoolRepo.createQueryBuilder('s');

    if (params.search?.trim()) {
      const term = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(s.name) LIKE :term OR LOWER(s.code) LIKE :term OR LOWER(s.email) LIKE :term OR LOWER(s.address) LIKE :term)',
        { term },
      );
    }

    if (params.status && params.status !== 'all') {
      query.andWhere('s.status = :status', { status: params.status });
    }

    if (params.plan && params.plan !== 'all') {
      query.andWhere('s.plan = :plan', { plan: params.plan });
    }

    query.orderBy('s.created_at', 'DESC');
    query.skip(skip).take(limit);

    const [schools, total] = await query.getManyAndCount();

    // Attach student & teacher counts for each school
    const schoolsWithCounts = await Promise.all(
      schools.map(async (sch) => {
        const studentCount = await this.studentRepo.count({
          where: { school_id: sch.id },
        });
        const teacherCount = await this.teacherRepo.count({
          where: { school_id: sch.id },
        });

        // Get primary owner
        const owner = await this.userRepo.findOne({
          where: { school_id: sch.id, role: UserRole.ADMIN },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            lastLoginAt: true,
            status: true,
          },
        });

        return {
          ...sch,
          student_count: studentCount,
          teacher_count: teacherCount,
          owner: owner || null,
        };
      }),
    );

    return {
      data: schoolsWithCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const school = await this.schoolRepo.findOne({
      where: { id },
      relations: { users: true },
    });

    if (!school) {
      throw new NotFoundException(`School with id '${id}' not found.`);
    }

    const studentCount = await this.studentRepo.count({
      where: { school_id: school.id },
    });
    const teacherCount = await this.teacherRepo.count({
      where: { school_id: school.id },
    });
    const staffCount = await this.staffRepo.count({
      where: { school_id: school.id },
    });

    const owners = school.users.filter((u) => u.role === UserRole.ADMIN);

    return {
      school,
      counts: {
        students: studentCount,
        teachers: teacherCount,
        staff: staffCount,
      },
      owners,
    };
  }

  async update(id: string, dto: UpdateSchoolDto) {
    const school = await this.schoolRepo.findOne({ where: { id } });
    if (!school) {
      throw new NotFoundException(`School with id '${id}' not found.`);
    }

    if (dto.code && dto.code !== school.code) {
      const codeExists = await this.schoolRepo.findOne({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (codeExists && codeExists.id !== id) {
        throw new ConflictException(
          `School code '${dto.code}' is already used.`,
        );
      }
      school.code = dto.code.trim().toUpperCase();
    }

    if (dto.slug && dto.slug !== school.slug) {
      const slugExists = await this.schoolRepo.findOne({
        where: { slug: dto.slug.trim().toLowerCase() },
      });
      if (slugExists && slugExists.id !== id) {
        throw new ConflictException(`Slug '${dto.slug}' is already used.`);
      }
      school.slug = dto.slug.trim().toLowerCase();
    }

    if (dto.name) school.name = dto.name.trim();
    if (dto.address !== undefined) school.address = dto.address?.trim() || null;
    if (dto.phone !== undefined) school.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) school.email = dto.email?.trim() || null;
    if (dto.website !== undefined) school.website = dto.website?.trim() || null;
    if (dto.logo_url !== undefined) school.logo_url = dto.logo_url?.trim() || null;
    if (dto.theme_color) school.theme_color = dto.theme_color.trim();
    if (dto.status) school.status = dto.status;
    if (dto.plan) school.plan = dto.plan;
    if (dto.max_students) school.max_students = dto.max_students;
    if (dto.max_teachers) school.max_teachers = dto.max_teachers;
    if (dto.notes !== undefined) school.notes = dto.notes?.trim() || null;

    return this.schoolRepo.save(school);
  }

  async toggleStatus(id: string, status?: SchoolStatus) {
    const school = await this.schoolRepo.findOne({ where: { id } });
    if (!school) {
      throw new NotFoundException(`School with id '${id}' not found.`);
    }

    school.status =
      status ||
      (school.status === SchoolStatus.ACTIVE
        ? SchoolStatus.SUSPENDED
        : SchoolStatus.ACTIVE);

    return this.schoolRepo.save(school);
  }

  async delete(id: string) {
    const school = await this.schoolRepo.findOne({ where: { id } });
    if (!school) {
      throw new NotFoundException(`School with id '${id}' not found.`);
    }

    // Suspend school instead of hard cascade drop for security
    school.status = SchoolStatus.SUSPENDED;
    await this.schoolRepo.save(school);

    return {
      message: `School '${school.name}' has been suspended successfully.`,
    };
  }

  async getSuperAdminStats() {
    const totalSchools = await this.schoolRepo.count();
    const activeSchools = await this.schoolRepo.count({
      where: { status: SchoolStatus.ACTIVE },
    });
    const suspendedSchools = await this.schoolRepo.count({
      where: { status: SchoolStatus.SUSPENDED },
    });

    const totalStudents = await this.studentRepo.count();
    const totalTeachers = await this.teacherRepo.count();
    const totalStaff = await this.staffRepo.count();

    // Plan distribution
    const starterCount = await this.schoolRepo.count({
      where: { plan: SubscriptionPlan.STARTER },
    });
    const standardCount = await this.schoolRepo.count({
      where: { plan: SubscriptionPlan.STANDARD },
    });
    const premiumCount = await this.schoolRepo.count({
      where: { plan: SubscriptionPlan.PREMIUM },
    });

    return {
      schools: {
        total: totalSchools,
        active: activeSchools,
        suspended: suspendedSchools,
      },
      platform_users: {
        total_students: totalStudents,
        total_teachers: totalTeachers,
        total_staff: totalStaff,
        total_individuals: totalStudents + totalTeachers + totalStaff,
      },
      plans: {
        starter: starterCount,
        standard: standardCount,
        premium: premiumCount,
      },
    };
  }
}

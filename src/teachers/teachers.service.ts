import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  EmploymentStatus,
  Teacher,
} from './entities/teacher.entity.js';
import { CreateTeacherDto } from './dto/create-teacher.dto.js';
import { UpdateTeacherDto } from './dto/update-teacher.dto.js';
import { QueryTeachersDto } from './dto/query-teachers.dto.js';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teachersRepo: Repository<Teacher>,
  ) {}

  private async generateEmployeeId(): Promise<string> {
    const count = await this.teachersRepo.count();
    let empId = `TCH_${String(count + 1).padStart(3, '0')}`;
    let exists = await this.teachersRepo.findOne({ where: { employee_id: empId } });
    let offset = 1;
    while (exists) {
      empId = `TCH_${String(count + 1 + offset).padStart(3, '0')}`;
      exists = await this.teachersRepo.findOne({ where: { employee_id: empId } });
      offset++;
    }
    return empId;
  }

  async createTeacher(dto: CreateTeacherDto): Promise<Teacher> {
    const employeeId = dto.employee_id?.trim() || (await this.generateEmployeeId());

    const existingEmp = await this.teachersRepo.findOne({
      where: { employee_id: employeeId },
    });
    if (existingEmp) {
      throw new ConflictException(`Employee ID "${employeeId}" already exists.`);
    }

    const teacher = this.teachersRepo.create({
      ...dto,
      employee_id: employeeId,
      full_name: dto.full_name.trim(),
      father_name: dto.father_name?.trim() || null,
      phone_number: dto.phone_number.trim(),
      email: dto.email?.trim().toLowerCase() || null,
      qualification: dto.qualification.trim(),
      specialization: dto.specialization?.trim() || null,
      previous_school: dto.previous_school?.trim() || null,
      remarks: dto.remarks?.trim() || null,
      base_salary: dto.base_salary !== undefined && dto.base_salary !== null ? Number(dto.base_salary) : 40000,
    });

    const savedTeacher = await this.teachersRepo.save(teacher);
    return this.findOneTeacher(savedTeacher.id);
  }

  async findAllTeachers(query: QueryTeachersDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.teachersRepo.createQueryBuilder('teacher');

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(teacher.full_name) LIKE :search OR LOWER(teacher.employee_id) LIKE :search OR teacher.phone_number LIKE :search OR LOWER(teacher.email) LIKE :search)',
        { search },
      );
    }

    if (query.status && query.status !== 'all') {
      qb.andWhere('teacher.employment_status = :status', { status: query.status });
    }

    if (query.designation && query.designation !== 'all') {
      qb.andWhere('teacher.designation = :designation', {
        designation: query.designation,
      });
    }

    if (query.employment_type && query.employment_type !== 'all') {
      qb.andWhere('teacher.employment_type = :employment_type', {
        employment_type: query.employment_type,
      });
    }

    if (query.gender && query.gender !== 'all') {
      qb.andWhere('teacher.gender = :gender', { gender: query.gender });
    }

    qb.orderBy('teacher.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneTeacher(id: string): Promise<Teacher> {
    const teacher = await this.teachersRepo.findOne({
      where: { id },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${id}" was not found.`);
    }

    return teacher;
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto): Promise<Teacher> {
    const teacher = await this.findOneTeacher(id);

    if (dto.employee_id && dto.employee_id.trim() !== teacher.employee_id) {
      const exists = await this.teachersRepo.findOne({
        where: { employee_id: dto.employee_id.trim() },
      });
      if (exists) {
        throw new ConflictException(
          `Employee ID "${dto.employee_id}" is already used by another teacher.`,
        );
      }
      teacher.employee_id = dto.employee_id.trim();
    }

    if (dto.full_name !== undefined) teacher.full_name = dto.full_name.trim();
    if (dto.father_name !== undefined) teacher.father_name = dto.father_name?.trim() || null;
    if (dto.gender !== undefined) teacher.gender = dto.gender;
    if (dto.date_of_birth !== undefined) teacher.date_of_birth = dto.date_of_birth || null;
    if (dto.phone_number !== undefined) teacher.phone_number = dto.phone_number.trim();
    if (dto.email !== undefined) teacher.email = dto.email?.trim().toLowerCase() || null;
    if (dto.profile_picture !== undefined) teacher.profile_picture = dto.profile_picture || null;
    if (dto.cnic_number !== undefined) teacher.cnic_number = dto.cnic_number?.trim() || null;
    if (dto.address !== undefined) teacher.address = dto.address?.trim() || null;

    if (dto.qualification !== undefined) teacher.qualification = dto.qualification.trim();
    if (dto.specialization !== undefined) teacher.specialization = dto.specialization?.trim() || null;
    if (dto.experience_years !== undefined) teacher.experience_years = dto.experience_years ?? null;
    if (dto.previous_school !== undefined) teacher.previous_school = dto.previous_school?.trim() || null;
    if (dto.designation !== undefined) teacher.designation = dto.designation;
    if (dto.joining_date !== undefined) teacher.joining_date = dto.joining_date;
    if (dto.employment_type !== undefined) teacher.employment_type = dto.employment_type;
    if (dto.base_salary !== undefined) teacher.base_salary = Number(dto.base_salary);

    if (dto.employment_status !== undefined) teacher.employment_status = dto.employment_status;
    if (dto.probation_period !== undefined) teacher.probation_period = dto.probation_period ?? null;
    if (dto.confirmation_date !== undefined) teacher.confirmation_date = dto.confirmation_date || null;
    if (dto.contract_end_date !== undefined) teacher.contract_end_date = dto.contract_end_date || null;
    if (dto.resignation_date !== undefined) teacher.resignation_date = dto.resignation_date || null;
    if (dto.leaving_reason !== undefined) teacher.leaving_reason = dto.leaving_reason?.trim() || null;

    if (dto.emergency_contact_name !== undefined) teacher.emergency_contact_name = dto.emergency_contact_name?.trim() || null;
    if (dto.emergency_contact_number !== undefined) teacher.emergency_contact_number = dto.emergency_contact_number?.trim() || null;
    if (dto.emergency_contact_relation !== undefined) teacher.emergency_contact_relation = dto.emergency_contact_relation?.trim() || null;
    if (dto.qualification_documents !== undefined) teacher.qualification_documents = dto.qualification_documents ?? [];
    if (dto.experience_certificates !== undefined) teacher.experience_certificates = dto.experience_certificates ?? [];
    if (dto.remarks !== undefined) teacher.remarks = dto.remarks?.trim() || null;

    await this.teachersRepo.save(teacher);
    return this.findOneTeacher(teacher.id);
  }

  async toggleTeacherStatus(id: string, status: EmploymentStatus): Promise<Teacher> {
    const teacher = await this.findOneTeacher(id);
    teacher.employment_status = status;
    await this.teachersRepo.save(teacher);
    return teacher;
  }

  async removeTeacher(id: string, permanent: boolean = false): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
    const teacher = await this.findOneTeacher(id);

    if (permanent) {
      await this.teachersRepo.remove(teacher);
      return { success: true, message: 'Teacher permanently deleted.' };
    }

    // Soft delete: status to TERMINATED
    teacher.employment_status = EmploymentStatus.TERMINATED;
    teacher.resignation_date = new Date().toISOString().split('T')[0];
    await this.teachersRepo.save(teacher);

    return {
      success: true,
      message: 'Teacher status set to Terminated (soft deleted).',
      softDeleted: true,
    };
  }

  async getStats() {
    const [totalTeachers, activeTeachers, inactiveTeachers] = await Promise.all([
      this.teachersRepo.count(),
      this.teachersRepo.count({ where: { employment_status: EmploymentStatus.ACTIVE } }),
      this.teachersRepo.count({
        where: {
          employment_status: In([EmploymentStatus.RESIGNED, EmploymentStatus.TERMINATED]),
        },
      }),
    ]);

    const designations = await this.teachersRepo
      .createQueryBuilder('teacher')
      .select('teacher.designation', 'designation')
      .addSelect('COUNT(*)', 'count')
      .groupBy('teacher.designation')
      .getRawMany();

    return {
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      byDesignation: designations.reduce(
        (acc, curr) => ({ ...acc, [curr.designation]: Number(curr.count) }),
        {},
      ),
    };
  }
}

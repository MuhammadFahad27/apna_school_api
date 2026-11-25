import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Student,
  StudentGender,
  StudentStatus,
} from './entities/student.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { School } from '../schools/entities/school.entity.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { QueryStudentsDto } from './dto/query-students.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepo: Repository<Student>,
    @InjectRepository(Class)
    private readonly classesRepo: Repository<Class>,
    @InjectRepository(Section)
    private readonly sectionsRepo: Repository<Section>,
    @InjectRepository(School)
    private readonly schoolsRepo: Repository<School>,
  ) {}

  private async generateStudentId(): Promise<string> {
    const count = await this.studentsRepo.count();
    let id = `STD_${String(count + 1).padStart(3, '0')}`;
    let offset = 1;
    while (await this.studentsRepo.findOne({ where: { student_id: id } })) {
      id = `STD_${String(count + 1 + offset).padStart(3, '0')}`;
      offset++;
    }
    return id;
  }

  private async generateAdmissionNumber(): Promise<string> {
    const count = await this.studentsRepo.count();
    let num = `ADM_${String(count + 1).padStart(3, '0')}`;
    let offset = 1;
    while (await this.studentsRepo.findOne({ where: { admission_number: num } })) {
      num = `ADM_${String(count + 1 + offset).padStart(3, '0')}`;
      offset++;
    }
    return num;
  }

  async createStudent(
    dto: CreateStudentDto,
    userId?: string,
    userSchoolId?: string,
  ): Promise<Student> {
    const schoolId = dto.school_id || userSchoolId;

    // Enforce subscription plan student limit
    if (schoolId) {
      const school = await this.schoolsRepo.findOne({ where: { id: schoolId } });
      if (school && school.max_students) {
        const activeCount = await this.studentsRepo.count({
          where: { school_id: schoolId, student_status: StudentStatus.ACTIVE },
        });
        if (activeCount >= school.max_students) {
          throw new BadRequestException(
            `School student limit reached (${school.max_students} students allowed on ${school.plan} plan). Please upgrade your plan.`,
          );
        }
      }
    }

    // 1. Validate Class & Section
    const cls = await this.classesRepo.findOne({ where: { id: dto.class_id } });
    if (!cls) {
      throw new BadRequestException(`Class with ID "${dto.class_id}" does not exist.`);
    }

    const sec = await this.sectionsRepo.findOne({
      where: { id: dto.section_id, class_id: dto.class_id },
    });
    if (!sec) {
      throw new BadRequestException(
        `Section with ID "${dto.section_id}" does not exist in class "${cls.name}".`,
      );
    }

    // 2. Generate or validate Student ID (Roll No)
    const studentId = dto.student_id?.trim() || (await this.generateStudentId());
    const existingStudentId = await this.studentsRepo.findOne({
      where: { student_id: studentId },
    });
    if (existingStudentId) {
      throw new ConflictException(`Student ID / Roll No "${studentId}" is already taken.`);
    }

    // 3. Generate or validate Admission Number
    const admissionNumber =
      dto.admission_number?.trim() || (await this.generateAdmissionNumber());
    const existingAdmission = await this.studentsRepo.findOne({
      where: { admission_number: admissionNumber },
    });
    if (existingAdmission) {
      throw new ConflictException(
        `Admission Number "${admissionNumber}" already exists.`,
      );
    }

    const fullName = `${dto.first_name.trim()} ${dto.last_name.trim()}`;

    const student = this.studentsRepo.create({
      ...dto,
      student_id: studentId,
      admission_number: admissionNumber,
      first_name: dto.first_name.trim(),
      last_name: dto.last_name.trim(),
      full_name: fullName,
      father_name: dto.father_name.trim(),
      father_contact_number: dto.father_contact_number.trim(),
      emergency_contact_number: dto.emergency_contact_number.trim(),
      school_id: schoolId || null,
      monthly_fee: dto.monthly_fee !== undefined ? Number(dto.monthly_fee) : 0,
      nationality: dto.nationality?.trim() || 'Pakistani',
      country: dto.country?.trim() || 'Pakistan',
      city: dto.city?.trim() || 'Karachi',
      created_by: userId || null,
      updated_by: userId || null,
    });

    const saved = await this.studentsRepo.save(student);
    return this.findOneStudent(saved.id);
  }

  async findAllStudents(query: QueryStudentsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.studentsRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.class', 'class')
      .leftJoinAndSelect('student.section', 'section');

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(student.full_name) LIKE :search OR LOWER(student.student_id) LIKE :search OR LOWER(student.admission_number) LIKE :search OR LOWER(student.father_name) LIKE :search OR student.father_contact_number LIKE :search OR student.emergency_contact_number LIKE :search)',
        { search },
      );
    }

    if (query.status && query.status !== 'all') {
      qb.andWhere('student.student_status = :status', { status: query.status });
    }

    if (query.class_id) {
      qb.andWhere('student.class_id = :class_id', { class_id: query.class_id });
    }

    if (query.section_id) {
      qb.andWhere('student.section_id = :section_id', {
        section_id: query.section_id,
      });
    }

    if (query.gender && query.gender !== 'all') {
      qb.andWhere('student.gender = :gender', { gender: query.gender });
    }

    if (query.academic_session) {
      qb.andWhere('student.academic_session = :session', {
        session: query.academic_session,
      });
    }

    qb.orderBy('student.created_at', 'DESC');
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

  async findOneStudent(id: string): Promise<Student> {
    const student = await this.studentsRepo.findOne({
      where: { id },
      relations: {
        class: true,
        section: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" was not found.`);
    }

    return student;
  }

  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    userId?: string,
  ): Promise<Student> {
    const student = await this.findOneStudent(id);

    // Validate class and section if changing
    const targetClassId = dto.class_id || student.class_id;
    const targetSectionId = dto.section_id || student.section_id;

    let targetClass: Class | null = null;
    let targetSection: Section | null = null;

    if (dto.class_id || dto.section_id) {
      targetClass = await this.classesRepo.findOne({ where: { id: targetClassId } });
      if (!targetClass) {
        throw new BadRequestException(`Class with ID "${targetClassId}" does not exist.`);
      }

      if (targetSectionId) {
        targetSection = await this.sectionsRepo.findOne({
          where: { id: targetSectionId, class_id: targetClassId },
        });
        if (!targetSection) {
          throw new BadRequestException(
            `Section with ID "${targetSectionId}" does not exist in class "${targetClass.name}".`,
          );
        }
      }
    }

    // Check unique Student ID
    if (dto.student_id && dto.student_id.trim() !== student.student_id) {
      const exists = await this.studentsRepo.findOne({
        where: { student_id: dto.student_id.trim() },
      });
      if (exists) {
        throw new ConflictException(
          `Student ID / Roll No "${dto.student_id}" is already used.`,
        );
      }
      student.student_id = dto.student_id.trim();
    }

    // Check unique Admission Number
    if (
      dto.admission_number &&
      dto.admission_number.trim() !== student.admission_number
    ) {
      const exists = await this.studentsRepo.findOne({
        where: { admission_number: dto.admission_number.trim() },
      });
      if (exists) {
        throw new ConflictException(
          `Admission Number "${dto.admission_number}" is already used.`,
        );
      }
      student.admission_number = dto.admission_number.trim();
    }

    if (dto.first_name !== undefined) student.first_name = dto.first_name.trim();
    if (dto.last_name !== undefined) student.last_name = dto.last_name.trim();
    student.full_name = `${student.first_name} ${student.last_name}`.trim();

    if (dto.date_of_birth !== undefined) student.date_of_birth = dto.date_of_birth;
    if (dto.gender !== undefined) student.gender = dto.gender;
    if (dto.profile_picture !== undefined) student.profile_picture = dto.profile_picture || null;
    if (dto.blood_group !== undefined) student.blood_group = dto.blood_group || null;
    if (dto.nationality !== undefined) student.nationality = dto.nationality.trim();

    if (dto.father_name !== undefined) student.father_name = dto.father_name.trim();
    if (dto.father_contact_number !== undefined) student.father_contact_number = dto.father_contact_number.trim();
    if (dto.father_occupation !== undefined) student.father_occupation = dto.father_occupation?.trim() || null;
    if (dto.mother_name !== undefined) student.mother_name = dto.mother_name?.trim() || null;
    if (dto.mother_contact_number !== undefined) student.mother_contact_number = dto.mother_contact_number?.trim() || null;
    if (dto.guardian_name !== undefined) student.guardian_name = dto.guardian_name?.trim() || null;
    if (dto.guardian_relation !== undefined) student.guardian_relation = dto.guardian_relation?.trim() || null;
    if (dto.emergency_contact_number !== undefined) student.emergency_contact_number = dto.emergency_contact_number.trim();

    if (dto.admission_date !== undefined) student.admission_date = dto.admission_date;
    if (dto.academic_session !== undefined) student.academic_session = dto.academic_session.trim();
    if (dto.class_id !== undefined) {
      student.class_id = dto.class_id;
      if (targetClass) student.class = targetClass;
    }
    if (dto.section_id !== undefined) {
      student.section_id = dto.section_id;
      if (targetSection) student.section = targetSection;
    }
    if (dto.previous_school !== undefined) student.previous_school = dto.previous_school?.trim() || null;
    if (dto.previous_class !== undefined) student.previous_class = dto.previous_class?.trim() || null;
    if (dto.previous_academic_record !== undefined) student.previous_academic_record = dto.previous_academic_record?.trim() || null;
    if (dto.student_status !== undefined) student.student_status = dto.student_status;
    if (dto.monthly_fee !== undefined) student.monthly_fee = Number(dto.monthly_fee);

    if (dto.country !== undefined) student.country = dto.country.trim();
    if (dto.city !== undefined) student.city = dto.city.trim();
    if (dto.area !== undefined) student.area = dto.area?.trim() || null;
    if (dto.complete_address !== undefined) student.complete_address = dto.complete_address?.trim() || null;

    if (dto.medical_notes !== undefined) student.medical_notes = dto.medical_notes?.trim() || null;
    if (dto.allergies !== undefined) student.allergies = dto.allergies?.trim() || null;
    if (dto.previous_school_documents !== undefined) student.previous_school_documents = dto.previous_school_documents ?? [];
    if (dto.birth_certificate_or_bform !== undefined) student.birth_certificate_or_bform = dto.birth_certificate_or_bform?.trim() || null;
    if (dto.remarks !== undefined) student.remarks = dto.remarks?.trim() || null;

    student.updated_by = userId || null;

    await this.studentsRepo.save(student);
    return this.findOneStudent(student.id);
  }

  async toggleStudentStatus(id: string, status: StudentStatus): Promise<Student> {
    const student = await this.findOneStudent(id);
    student.student_status = status;
    await this.studentsRepo.save(student);
    return student;
  }

  async removeStudent(
    id: string,
    permanent: boolean = false,
  ): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
    const student = await this.findOneStudent(id);

    if (permanent) {
      await this.studentsRepo.remove(student);
      return { success: true, message: 'Student record permanently deleted.' };
    }

    student.student_status = StudentStatus.INACTIVE;
    await this.studentsRepo.save(student);

    return {
      success: true,
      message: 'Student marked as Inactive (soft deleted).',
      softDeleted: true,
    };
  }

  async getStats() {
    const [totalStudents, activeStudents, inactiveStudents, maleCount, femaleCount] =
      await Promise.all([
        this.studentsRepo.count(),
        this.studentsRepo.count({ where: { student_status: StudentStatus.ACTIVE } }),
        this.studentsRepo.count({
          where: { student_status: StudentStatus.INACTIVE },
        }),
        this.studentsRepo.count({ where: { gender: StudentGender.MALE } }),
        this.studentsRepo.count({ where: { gender: StudentGender.FEMALE } }),
      ]);

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      genderBreakdown: {
        male: maleCount,
        female: femaleCount,
      },
    };
  }
}

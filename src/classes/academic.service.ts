import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Class } from './entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { Student, StudentStatus } from '../students/entities/student.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';
import {
  EnrollmentStatus,
  StudentEnrollment,
} from './entities/student-enrollment.entity.js';
import { ClassTeacherAssignment } from './entities/class-teacher-assignment.entity.js';
import { SectionSubject } from './entities/section-subject.entity.js';
import { SubjectTeacherAssignment } from './entities/subject-teacher-assignment.entity.js';

@Injectable()
export class AcademicService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Section)
    private readonly sectionRepo: Repository<Section>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(StudentEnrollment)
    private readonly enrollmentRepo: Repository<StudentEnrollment>,
    @InjectRepository(ClassTeacherAssignment)
    private readonly classTeacherRepo: Repository<ClassTeacherAssignment>,
    @InjectRepository(SectionSubject)
    private readonly sectionSubjectRepo: Repository<SectionSubject>,
    @InjectRepository(SubjectTeacherAssignment)
    private readonly subjectTeacherRepo: Repository<SubjectTeacherAssignment>,
  ) {}

  private getDefaultSession(): string {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  }

  // ---------------- 1. CLASS OVERVIEW ----------------

  async getClassOverview(classId: string, session?: string) {
    const academicSession = session?.trim() || this.getDefaultSession();

    const cls = await this.classRepo.findOne({
      where: { id: classId },
      relations: { sections: true },
      order: { sections: { name: 'ASC' } },
    });

    if (!cls) {
      throw new NotFoundException(`Class with ID '${classId}' not found.`);
    }

    const sectionIds = cls.sections.map((s) => s.id);

    // Active Class Teachers for these sections
    const activeClassTeachers = sectionIds.length > 0
      ? await this.classTeacherRepo.find({
          where: {
            section_id: In(sectionIds),
            is_active: true,
          },
          relations: { teacher: true },
        })
      : [];

    const teacherMap = new Map<string, Teacher>();
    for (const act of activeClassTeachers) {
      if (act.teacher) {
        teacherMap.set(act.section_id, act.teacher);
      }
    }

    // Auto-sync curriculum subjects across sections of the same class
    if (sectionIds.length > 1) {
      const allClassSubjects = await this.sectionSubjectRepo.find({
        where: { section_id: In(sectionIds) },
      });
      const uniqueSubjectEntries = new Map<string, string>();
      for (const cs of allClassSubjects) {
        if (!uniqueSubjectEntries.has(cs.subject_id)) {
          uniqueSubjectEntries.set(cs.subject_id, cs.academic_session);
        }
      }

      if (uniqueSubjectEntries.size > 0) {
        const existingBySection = new Map<string, Set<string>>();
        for (const secId of sectionIds) {
          existingBySection.set(secId, new Set<string>());
        }
        for (const cs of allClassSubjects) {
          existingBySection.get(cs.section_id)?.add(cs.subject_id);
        }

        const toSync: SectionSubject[] = [];
        for (const secId of sectionIds) {
          const existingSet = existingBySection.get(secId);
          for (const [subId, sess] of uniqueSubjectEntries.entries()) {
            if (!existingSet?.has(subId)) {
              toSync.push(
                this.sectionSubjectRepo.create({
                  section_id: secId,
                  subject_id: subId,
                  academic_session: sess || academicSession,
                  status: 'active',
                }),
              );
            }
          }
        }
        if (toSync.length > 0) {
          await this.sectionSubjectRepo.save(toSync);
        }
      }
    }

    // Section Subjects & Teachers
    const sectionSubjects = sectionIds.length > 0
      ? await this.sectionSubjectRepo.find({
          where: { section_id: In(sectionIds) },
          relations: { subject: true, teacherAssignments: { teacher: true } },
        })
      : [];

    const subjectCountMap = new Map<string, number>();
    const uniqueSubjectIds = new Set<string>();
    const uniqueTeacherIds = new Set<string>();

    for (const ss of sectionSubjects) {
      const current = subjectCountMap.get(ss.section_id) || 0;
      subjectCountMap.set(ss.section_id, current + 1);
      if (ss.subject_id) uniqueSubjectIds.add(ss.subject_id);

      if (ss.teacherAssignments) {
        for (const ta of ss.teacherAssignments) {
          if (ta.is_active && ta.teacher_id) {
            uniqueTeacherIds.add(ta.teacher_id);
          }
        }
      }
    }

    // Also include class teachers in unique teachers
    for (const act of activeClassTeachers) {
      if (act.teacher_id) uniqueTeacherIds.add(act.teacher_id);
    }

    // Enrolled students per section: check both student_enrollments & student records
    const detailedSections = await Promise.all(
      cls.sections.map(async (sec) => {
        // Enrolled count: count active students associated with this section
        const studentCount = await this.studentRepo.count({
          where: { section_id: sec.id },
        });

        const classTeacher = teacherMap.get(sec.id) || null;
        const subjectsCount = subjectCountMap.get(sec.id) || 0;

        return {
          id: sec.id,
          name: sec.name,
          room_number: sec.room_number,
          capacity: sec.capacity,
          status: sec.status,
          total_students: studentCount,
          subjects_count: subjectsCount,
          class_teacher: classTeacher
            ? {
                id: classTeacher.id,
                employee_id: classTeacher.employee_id,
                full_name: classTeacher.full_name,
                designation: classTeacher.designation,
                phone_number: classTeacher.phone_number,
                profile_picture: classTeacher.profile_picture,
                qualification: classTeacher.qualification,
              }
            : null,
        };
      }),
    );

    const totalStudents = detailedSections.reduce(
      (sum, s) => sum + s.total_students,
      0,
    );

    return {
      class: {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        description: cls.description,
        status: cls.status,
        academic_session: academicSession,
      },
      stats: {
        total_students: totalStudents,
        total_sections: cls.sections.length,
        total_subjects: uniqueSubjectIds.size,
        assigned_teachers: uniqueTeacherIds.size,
      },
      sections: detailedSections,
    };
  }

  // ---------------- 2. SECTION SPECIFIC DETAILS ----------------

  async getSectionDetails(sectionId: string, session?: string) {
    const academicSession = session?.trim() || this.getDefaultSession();

    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
      relations: { class: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID '${sectionId}' not found.`);
    }

    // Active Class Teacher
    const activeClassTeacher = await this.classTeacherRepo.findOne({
      where: {
        section_id: sectionId,
        is_active: true,
      },
      relations: { teacher: true },
      order: { assigned_date: 'DESC' },
    });

    // Enrolled Students
    // We get students currently assigned to this section
    const students = await this.studentRepo.find({
      where: { section_id: sectionId },
      order: { student_id: 'ASC', full_name: 'ASC' },
    });

    // Get any enrollment metadata (e.g. status/date)
    const enrollments = await this.enrollmentRepo.find({
      where: { section_id: sectionId },
    });
    const enrollmentMap = new Map<string, StudentEnrollment>();
    for (const en of enrollments) {
      enrollmentMap.set(en.student_id, en);
    }

    const enrolledStudents = students.map((std) => {
      const en = enrollmentMap.get(std.id);
      return {
        id: std.id,
        student_id: std.student_id,
        admission_number: std.admission_number,
        first_name: std.first_name,
        last_name: std.last_name,
        full_name: std.full_name,
        date_of_birth: std.date_of_birth,
        gender: std.gender,
        profile_picture: std.profile_picture,
        father_name: std.father_name,
        father_contact_number: std.father_contact_number,
        student_status: std.student_status,
        enrollment_status: en?.status || EnrollmentStatus.ACTIVE,
        enrollment_date: en?.enrollment_date || std.admission_date,
        enrollment_id: en?.id || null,
      };
    });

    // Auto-sync: Ensure this section inherits all curriculum subjects of its parent class
    if (section.class_id) {
      const classSiblings = await this.sectionRepo.find({
        where: { class_id: section.class_id },
        select: { id: true },
      });
      const siblingIds = classSiblings.map((s) => s.id);
      if (siblingIds.length > 0) {
        const siblingSubjects = await this.sectionSubjectRepo.find({
          where: { section_id: In(siblingIds) },
        });

        const currentSubjects = siblingSubjects.filter((ss) => ss.section_id === sectionId);
        const currentSubIds = new Set(currentSubjects.map((s) => s.subject_id));

        const toAdd: SectionSubject[] = [];
        for (const sib of siblingSubjects) {
          if (!currentSubIds.has(sib.subject_id)) {
            currentSubIds.add(sib.subject_id);
            toAdd.push(
              this.sectionSubjectRepo.create({
                section_id: sectionId,
                subject_id: sib.subject_id,
                academic_session: sib.academic_session || academicSession,
                status: 'active',
              }),
            );
          }
        }
        if (toAdd.length > 0) {
          await this.sectionSubjectRepo.save(toAdd);
        }
      }
    }

    // Section Subjects with active teacher assignments
    const sectionSubjects = await this.sectionSubjectRepo.find({
      where: { section_id: sectionId },
      relations: {
        subject: true,
        teacherAssignments: { teacher: true },
      },
      order: { created_at: 'ASC' },
    });

    const subjectsData = sectionSubjects.map((ss) => {
      const activeTa = ss.teacherAssignments?.find((ta) => ta.is_active);
      const teacher = activeTa?.teacher || null;

      return {
        section_subject_id: ss.id,
        subject: {
          id: ss.subject?.id || ss.subject_id,
          subject_id: ss.subject?.subject_id || '',
          name: ss.subject?.name || 'Unknown',
          code: ss.subject?.code || '',
          status: ss.subject?.status || 'active',
        },
        assigned_teacher: teacher
          ? {
              id: teacher.id,
              employee_id: teacher.employee_id,
              full_name: teacher.full_name,
              designation: teacher.designation,
              phone_number: teacher.phone_number,
              profile_picture: teacher.profile_picture,
              qualification: teacher.qualification,
            }
          : null,
        assignment_id: activeTa?.id || null,
        academic_session: ss.academic_session,
      };
    });

    return {
      section: {
        id: section.id,
        name: section.name,
        room_number: section.room_number,
        capacity: section.capacity,
        status: section.status,
        class_id: section.class_id,
        class_name: section.class?.name || '',
        class_code: section.class?.code || '',
        academic_session: academicSession,
      },
      class_teacher: activeClassTeacher?.teacher
        ? {
            id: activeClassTeacher.teacher.id,
            assignment_id: activeClassTeacher.id,
            employee_id: activeClassTeacher.teacher.employee_id,
            full_name: activeClassTeacher.teacher.full_name,
            designation: activeClassTeacher.teacher.designation,
            phone_number: activeClassTeacher.teacher.phone_number,
            profile_picture: activeClassTeacher.teacher.profile_picture,
            qualification: activeClassTeacher.teacher.qualification,
            assigned_date: activeClassTeacher.assigned_date,
          }
        : null,
      enrolled_students: enrolledStudents,
      subjects: subjectsData,
      stats: {
        total_students: enrolledStudents.length,
        total_subjects: subjectsData.length,
      },
    };
  }

  // ---------------- 3. STUDENT ENROLLMENT ----------------

  async enrollStudent(
    sectionId: string,
    dto: {
      student_id: string;
      academic_session?: string;
      roll_number?: string;
    },
  ) {
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
      relations: { class: true },
    });
    if (!section) {
      throw new NotFoundException(`Section with ID '${sectionId}' not found.`);
    }

    const student = await this.studentRepo.findOne({
      where: { id: dto.student_id },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID '${dto.student_id}' not found.`);
    }

    // Restriction check: A student already enrolled in any section cannot be enrolled into another section
    if (student.section_id) {
      if (student.section_id === section.id) {
        throw new BadRequestException(
          `طالب علم '${student.full_name}' پہلے ہی اس سیکشن میں داخل ہے۔ (Student is already enrolled in this section.)`,
        );
      }
      const currentSection = await this.sectionRepo.findOne({
        where: { id: student.section_id },
        relations: { class: true },
      });
      const secName = currentSection ? currentSection.name : 'another section';
      const clsName = currentSection?.class ? ` (${currentSection.class.name})` : '';
      throw new BadRequestException(
        `طالب علم '${student.full_name}' پہلے ہی سیکشن '${secName}'${clsName} میں داخل ہے۔ پہلے پرانے سیکشن سے طالب علم کو الگ (Remove) کریں، اس کے بعد نئے سیکشن میں داخل کریں۔ (Student is already enrolled in Section '${secName}'${clsName}. Please remove them from their current section before enrolling into a new one.)`,
      );
    }

    const session = dto.academic_session?.trim() || student.academic_session || this.getDefaultSession();

    // Check if section capacity is exceeded
    const currentCount = await this.studentRepo.count({
      where: { section_id: section.id },
    });
    if (section.capacity && currentCount >= section.capacity) {
      throw new BadRequestException(
        `Section '${section.name}' has reached its maximum capacity of ${section.capacity} students.`,
      );
    }

    // Run transaction to sync both student and enrollment record
    return await this.dataSource.transaction(async (manager) => {
      let enrollment = await manager.findOne(StudentEnrollment, {
        where: {
          student_id: student.id,
          academic_session: session,
        },
      });

      if (enrollment) {
        enrollment.class_id = section.class_id;
        enrollment.section_id = section.id;
        enrollment.status = EnrollmentStatus.ACTIVE;
        if (dto.roll_number) enrollment.roll_number = dto.roll_number.trim();
        await manager.save(StudentEnrollment, enrollment);
      } else {
        enrollment = manager.create(StudentEnrollment, {
          student_id: student.id,
          class_id: section.class_id,
          section_id: section.id,
          academic_session: session,
          roll_number: dto.roll_number?.trim() || student.student_id,
          status: EnrollmentStatus.ACTIVE,
        });
        await manager.save(StudentEnrollment, enrollment);
      }

      // Update student table foreign keys
      student.class_id = section.class_id;
      student.section_id = section.id;
      student.academic_session = session;
      await manager.save(Student, student);

      return {
        message: `Student '${student.full_name}' successfully enrolled in Section '${section.name}'.`,
        enrollment,
      };
    });
  }

  async removeEnrollment(sectionId: string, studentId: string) {
    const student = await this.studentRepo.findOne({
      where: { id: studentId, section_id: sectionId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID '${studentId}' is not enrolled in this section.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Mark enrollment as transferred/dropped rather than destroying historical data
      const enrollment = await manager.findOne(StudentEnrollment, {
        where: {
          student_id: studentId,
          section_id: sectionId,
        },
      });
      if (enrollment) {
        enrollment.status = EnrollmentStatus.TRANSFERRED;
        await manager.save(StudentEnrollment, enrollment);
      }

      // Reset student's section assignment so they are now free to be assigned to another section
      student.section_id = null as any;
      student.section = null as any;
      await manager.save(Student, student);
    });

    return {
      message: `Student enrollment updated successfully.`,
    };
  }

  async getAvailableStudents(sectionId: string, search?: string) {
    const qb = this.studentRepo
      .createQueryBuilder('std')
      .where('std.section_id IS NULL')
      .andWhere('std.student_status = :status', { status: StudentStatus.ACTIVE })
      .orderBy('std.student_id', 'ASC');

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        '(std.full_name ILIKE :term OR std.student_id ILIKE :term OR std.admission_number ILIKE :term)',
        { term },
      );
    }

    qb.take(30);

    const students = await qb.getMany();
    return students.map((s) => ({
      id: s.id,
      student_id: s.student_id,
      admission_number: s.admission_number,
      full_name: s.full_name,
      gender: s.gender,
      current_class_id: s.class_id,
      current_section_id: s.section_id,
    }));
  }

  // ---------------- 4. CLASS TEACHER ASSIGNMENT ----------------

  async assignClassTeacher(
    sectionId: string,
    dto: { teacher_id: string; academic_session?: string },
  ) {
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
      relations: { class: true },
    });
    if (!section) {
      throw new NotFoundException(`Section with ID '${sectionId}' not found.`);
    }

    const teacher = await this.teacherRepo.findOne({
      where: { id: dto.teacher_id },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${dto.teacher_id}' not found.`);
    }

    const session = dto.academic_session?.trim() || this.getDefaultSession();

    return await this.dataSource.transaction(async (manager) => {
      // Deactivate any currently active class teacher for this section and session
      await manager.update(
        ClassTeacherAssignment,
        { section_id: sectionId, academic_session: session, is_active: true },
        { is_active: false },
      );

      // Create new active assignment
      const assignment = manager.create(ClassTeacherAssignment, {
        section_id: sectionId,
        teacher_id: teacher.id,
        academic_session: session,
        is_active: true,
      });

      const saved = await manager.save(ClassTeacherAssignment, assignment);

      return {
        message: `${teacher.full_name} assigned as Class Teacher for Section ${section.name}.`,
        assignment: saved,
      };
    });
  }

  async removeClassTeacher(sectionId: string, session?: string) {
    const sessionToUse = session?.trim() || this.getDefaultSession();

    await this.classTeacherRepo.update(
      { section_id: sectionId, academic_session: sessionToUse, is_active: true },
      { is_active: false },
    );

    return { message: 'Class teacher removed successfully.' };
  }

  // ---------------- 5. SUBJECT & SUBJECT TEACHER ASSIGNMENT ----------------

  async assignSubjectToSection(
    sectionId: string,
    dto: {
      subject_id: string;
      teacher_id?: string;
      academic_session?: string;
    },
  ) {
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
      relations: { class: true },
    });
    if (!section) {
      throw new NotFoundException(`Section with ID '${sectionId}' not found.`);
    }

    const subject = await this.subjectRepo.findOne({
      where: { id: dto.subject_id },
    });
    if (!subject) {
      throw new NotFoundException(`Subject with ID '${dto.subject_id}' not found.`);
    }

    const session = dto.academic_session?.trim() || this.getDefaultSession();

    // Check if subject is already assigned to this section
    const existing = await this.sectionSubjectRepo.findOne({
      where: {
        section_id: sectionId,
        subject_id: subject.id,
        academic_session: session,
      },
    });
    if (existing) {
      throw new ConflictException(
        `مضمون '${subject.name}' پہلے ہی اس کلاس کے نصاب میں شامل ہے۔ (Subject '${subject.name}' is already assigned to this class curriculum.)`,
      );
    }

    // In a school, curriculum subjects belong to the class and are identical across all sections
    const allClassSections = await this.sectionRepo.find({
      where: { class_id: section.class_id },
    });

    return await this.dataSource.transaction(async (manager) => {
      let activeSectionSubject: SectionSubject | null = null;
      let savedTa: SubjectTeacherAssignment | null = null;

      for (const sec of allClassSections) {
        let ss = await manager.findOne(SectionSubject, {
          where: {
            section_id: sec.id,
            subject_id: subject.id,
            academic_session: session,
          },
        });

        if (!ss) {
          ss = manager.create(SectionSubject, {
            section_id: sec.id,
            subject_id: subject.id,
            academic_session: session,
            status: 'active',
          });
          ss = await manager.save(SectionSubject, ss);
        }

        if (sec.id === sectionId) {
          activeSectionSubject = ss;
          if (dto.teacher_id) {
            const teacher = await manager.findOne(Teacher, {
              where: { id: dto.teacher_id },
            });
            if (teacher) {
              const ta = manager.create(SubjectTeacherAssignment, {
                section_subject_id: ss.id,
                teacher_id: teacher.id,
                academic_session: session,
                is_active: true,
              });
              savedTa = await manager.save(SubjectTeacherAssignment, ta);
            }
          }
        }
      }

      return {
        message: `Subject '${subject.name}' successfully added to class curriculum across all sections.`,
        sectionSubject: activeSectionSubject,
        teacherAssignment: savedTa,
      };
    });
  }

  async assignTeacherToSubject(
    sectionSubjectId: string,
    dto: { teacher_id: string; academic_session?: string },
  ) {
    const ss = await this.sectionSubjectRepo.findOne({
      where: { id: sectionSubjectId },
      relations: { subject: true, section: true },
    });
    if (!ss) {
      throw new NotFoundException(`Section subject record not found.`);
    }

    const teacher = await this.teacherRepo.findOne({
      where: { id: dto.teacher_id },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher not found.`);
    }

    const session = dto.academic_session?.trim() || ss.academic_session || this.getDefaultSession();

    return await this.dataSource.transaction(async (manager) => {
      // Deactivate current active teacher assignment for this section subject
      await manager.update(
        SubjectTeacherAssignment,
        { section_subject_id: sectionSubjectId, is_active: true },
        { is_active: false },
      );

      const ta = manager.create(SubjectTeacherAssignment, {
        section_subject_id: sectionSubjectId,
        teacher_id: teacher.id,
        academic_session: session,
        is_active: true,
      });

      const savedTa = await manager.save(SubjectTeacherAssignment, ta);

      return {
        message: `${teacher.full_name} assigned to teach ${ss.subject?.name || 'subject'}.`,
        assignment: savedTa,
      };
    });
  }

  async removeTeacherFromSubject(sectionSubjectId: string) {
    await this.subjectTeacherRepo.update(
      { section_subject_id: sectionSubjectId, is_active: true },
      { is_active: false },
    );
    return { message: 'Teacher removed from subject.' };
  }

  async removeSubjectFromSection(sectionSubjectId: string) {
    const ss = await this.sectionSubjectRepo.findOne({
      where: { id: sectionSubjectId },
      relations: { subject: true, section: true },
    });
    if (!ss) {
      throw new NotFoundException('Assigned subject record not found.');
    }

    const subjectName = ss.subject?.name || 'Subject';
    const classId = ss.section?.class_id;

    if (classId) {
      const allClassSecSubjects = await this.sectionSubjectRepo
        .createQueryBuilder('ss')
        .innerJoin('ss.section', 'sec')
        .where('sec.class_id = :classId', { classId })
        .andWhere('ss.subject_id = :subjectId', { subjectId: ss.subject_id })
        .getMany();

      if (allClassSecSubjects.length > 0) {
        await this.sectionSubjectRepo.remove(allClassSecSubjects);
      }
    } else {
      await this.sectionSubjectRepo.remove(ss);
    }

    return {
      message: `Subject '${subjectName}' removed from class curriculum across all sections.`,
    };
  }
}

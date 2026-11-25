import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';
import { StudentEnrollment } from './entities/student-enrollment.entity.js';
import { ClassTeacherAssignment } from './entities/class-teacher-assignment.entity.js';
import { SectionSubject } from './entities/section-subject.entity.js';
import { SubjectTeacherAssignment } from './entities/subject-teacher-assignment.entity.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { AcademicController } from './academic.controller.js';
import { AcademicService } from './academic.service.js';
import { SectionsModule } from '../sections/sections.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Class,
      Section,
      Student,
      Teacher,
      Subject,
      StudentEnrollment,
      ClassTeacherAssignment,
      SectionSubject,
      SubjectTeacherAssignment,
    ]),
    SectionsModule,
  ],
  controllers: [ClassesController, AcademicController],
  providers: [ClassesService, AcademicService],
  exports: [ClassesService, AcademicService, TypeOrmModule],
})
export class ClassesModule {}

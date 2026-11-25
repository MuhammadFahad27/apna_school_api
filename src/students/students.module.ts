import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { School } from '../schools/entities/school.entity.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Class, Section, School])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService, TypeOrmModule],
})
export class StudentsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolsService } from './schools.service.js';
import { SchoolsController } from './schools.controller.js';
import { SchoolProfileController } from './school-profile.controller.js';
import { School } from './entities/school.entity.js';
import { User } from '../users/user.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, User, Student, Teacher, Staff]),
    MailModule,
  ],
  controllers: [SchoolsController, SchoolProfileController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}

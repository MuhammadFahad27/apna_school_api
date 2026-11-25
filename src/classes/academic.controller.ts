import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AcademicService } from './academic.service.js';

@Controller('academic')
@UseGuards(JwtAuthGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // 1. Class Overview (for Class Detail Page)
  @Get('classes/:classId/overview')
  getClassOverview(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('session') session?: string,
  ) {
    return this.academicService.getClassOverview(classId, session);
  }

  // 2. Section Details (Enrolled Students + Subjects + Class Teacher)
  @Get('sections/:sectionId/details')
  getSectionDetails(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Query('session') session?: string,
  ) {
    return this.academicService.getSectionDetails(sectionId, session);
  }

  // 3. Available students to enroll
  @Get('sections/:sectionId/available-students')
  getAvailableStudents(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Query('search') search?: string,
  ) {
    return this.academicService.getAvailableStudents(sectionId, search);
  }

  // 4. Enroll Student
  @Post('sections/:sectionId/enroll')
  enrollStudent(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body()
    dto: {
      student_id: string;
      academic_session?: string;
      roll_number?: string;
    },
  ) {
    return this.academicService.enrollStudent(sectionId, dto);
  }

  // 5. Remove / Transfer Student Enrollment
  @Delete('sections/:sectionId/enroll/:studentId')
  removeEnrollment(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.academicService.removeEnrollment(sectionId, studentId);
  }

  // 6. Assign Class Teacher
  @Post('sections/:sectionId/class-teacher')
  assignClassTeacher(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: { teacher_id: string; academic_session?: string },
  ) {
    return this.academicService.assignClassTeacher(sectionId, dto);
  }

  // 7. Remove Class Teacher
  @Delete('sections/:sectionId/class-teacher')
  removeClassTeacher(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Query('session') session?: string,
  ) {
    return this.academicService.removeClassTeacher(sectionId, session);
  }

  // 8. Assign Subject to Section (with optional teacher)
  @Post('sections/:sectionId/subjects')
  assignSubjectToSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body()
    dto: {
      subject_id: string;
      teacher_id?: string;
      academic_session?: string;
    },
  ) {
    return this.academicService.assignSubjectToSection(sectionId, dto);
  }

  // 9. Assign or Change Subject Teacher
  @Patch('section-subjects/:sectionSubjectId/teacher')
  assignTeacherToSubject(
    @Param('sectionSubjectId', ParseUUIDPipe) sectionSubjectId: string,
    @Body() dto: { teacher_id: string; academic_session?: string },
  ) {
    return this.academicService.assignTeacherToSubject(sectionSubjectId, dto);
  }

  // 10. Remove Teacher from Subject
  @Delete('section-subjects/:sectionSubjectId/teacher')
  removeTeacherFromSubject(
    @Param('sectionSubjectId', ParseUUIDPipe) sectionSubjectId: string,
  ) {
    return this.academicService.removeTeacherFromSubject(sectionSubjectId);
  }

  // 11. Remove Subject from Section
  @Delete('section-subjects/:sectionSubjectId')
  removeSubjectFromSection(
    @Param('sectionSubjectId', ParseUUIDPipe) sectionSubjectId: string,
  ) {
    return this.academicService.removeSubjectFromSection(sectionSubjectId);
  }
}

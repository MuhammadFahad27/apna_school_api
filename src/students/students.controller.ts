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
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { StudentsService } from './students.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { QueryStudentsDto } from './dto/query-students.dto.js';
import { StudentStatus } from './entities/student.entity.js';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() dto: CreateStudentDto, @Request() req: any) {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    return this.studentsService.createStudent(dto, userId, schoolId);
  }

  @Get('stats')
  getStats() {
    return this.studentsService.getStats();
  }

  @Get()
  findAll(@Query() query: QueryStudentsDto) {
    return this.studentsService.findAllStudents(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findOneStudent(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.studentsService.updateStudent(id, dto, userId);
  }

  @Patch(':id/status')
  toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: StudentStatus,
  ) {
    return this.studentsService.toggleStudentStatus(id, status);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ) {
    return this.studentsService.removeStudent(id, permanent === 'true');
  }
}

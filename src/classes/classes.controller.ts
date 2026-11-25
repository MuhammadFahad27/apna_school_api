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
import { ClassesService } from './classes.service.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { QueryClassesDto } from './dto/query-classes.dto.js';
import { CreateSectionDto } from '../sections/dto/create-section.dto.js';
import { UpdateSectionDto } from '../sections/dto/update-section.dto.js';
import { ClassStatus } from './entities/class.entity.js';
import { SectionStatus } from '../sections/entities/section.entity.js';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // ---------------- CLASS ENDPOINTS ----------------

  @Post()
  createClass(@Body() dto: CreateClassDto) {
    return this.classesService.createClass(dto);
  }

  @Get('stats')
  getStats() {
    return this.classesService.getStats();
  }

  @Get()
  findAllClasses(@Query() query: QueryClassesDto) {
    return this.classesService.findAllClasses(query);
  }

  @Get(':id')
  findOneClass(@Param('id', ParseUUIDPipe) id: string) {
    return this.classesService.findOneClass(id);
  }

  @Patch(':id')
  updateClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.updateClass(id, dto);
  }

  @Patch(':id/status')
  toggleClassStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status?: ClassStatus,
  ) {
    return this.classesService.toggleClassStatus(id, status);
  }

  @Delete(':id')
  removeClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ) {
    return this.classesService.removeClass(id, permanent === 'true');
  }

  // ---------------- SECTION ENDPOINTS ----------------

  @Post(':classId/sections')
  createSection(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.classesService.createSection(classId, dto);
  }

  @Get(':classId/sections')
  findSectionsByClass(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.classesService.findSectionsByClass(classId);
  }

  @Get('sections/:id')
  findOneSection(@Param('id', ParseUUIDPipe) id: string) {
    return this.classesService.findOneSection(id);
  }

  @Patch('sections/:id')
  updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.classesService.updateSection(id, dto);
  }

  @Patch('sections/:id/status')
  toggleSectionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status?: SectionStatus,
  ) {
    return this.classesService.toggleSectionStatus(id, status);
  }

  @Delete('sections/:id')
  removeSection(@Param('id', ParseUUIDPipe) id: string) {
    return this.classesService.removeSection(id);
  }
}

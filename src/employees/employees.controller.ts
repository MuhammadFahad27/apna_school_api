import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CreateEmployeeDto,
  DeactivateEmployeeDto,
  ResetEmployeePasswordDto,
  UpdateEmployeeDto,
} from './dto/index.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user.entity.js';
import { EmployeesService } from './employees.service.js';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FARM_OWNER, UserRole.MANAGER)
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('farmId') farmId?: string,
  ) {
    return this.employeesService.findAll(req.user, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      role,
      status,
      farmId,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FARM_OWNER, UserRole.MANAGER)
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.employeesService.findOne(req.user, id);
  }

  @Post()
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(req.user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(req.user, id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN)
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: DeactivateEmployeeDto & { isActive?: boolean },
  ) {
    const isActive = dto.isActive !== undefined ? Boolean(dto.isActive) : false;
    return this.employeesService.updateStatus(
      req.user,
      id,
      isActive,
      dto.reason,
    );
  }

  @Post(':id/reset-password')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN)
  resetPassword(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto?: ResetEmployeePasswordDto,
  ) {
    return this.employeesService.resetPassword(req.user, id, dto);
  }
}

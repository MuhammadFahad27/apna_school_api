import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ArchiveFarmDto,
  CreateFarmOwnerDto,
  SuspendFarmDto,
  UpdateEmployeeStatusDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user.entity.js';
import { FarmsService } from './farms.service.js';

@Controller('farms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    return this.farmsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 8,
      search,
      status,
      sort,
      order,
    });
  }

  @Post('owners')
  @Roles(UserRole.ADMIN)
  createOwner(@Body() dto: CreateFarmOwnerDto) {
    return this.farmsService.createOwner(dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.farmsService.findOne(id);
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN)
  suspend(@Param('id') id: string, @Body() dto: SuspendFarmDto) {
    return this.farmsService.suspend(id, dto);
  }

  @Post(':id/reactivate')
  @Roles(UserRole.ADMIN)
  reactivate(@Param('id') id: string) {
    return this.farmsService.reactivate(id);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  resetOwnerPassword(@Param('id') id: string) {
    return this.farmsService.resetOwnerPassword(id);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN)
  archive(@Param('id') id: string, @Body() dto: ArchiveFarmDto) {
    return this.farmsService.archive(id, dto);
  }

  @Get(':id/employees')
  @Roles(UserRole.ADMIN, UserRole.FARM_OWNER)
  employees(@Param('id') id: string) {
    return this.farmsService.employeesForFarm(id);
  }

  @Patch(':id/employees/:employeeId/status')
  @Roles(UserRole.ADMIN, UserRole.FARM_OWNER)
  updateEmployeeStatus(
    @Param('id') farmId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.farmsService.updateEmployeeStatus(farmId, employeeId, dto);
  }
}

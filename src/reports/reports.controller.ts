import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user.entity.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Owner dashboard summary:
   * Aaj ka doodh (subah, shaam, total) aur kal se muqabla.
   * Is mahine ka doodh, billing, wasooli, kharcha, andaza nafa.
   * Kul baqaya aur top 5 customers.
   * Aaj entry baqi.
   */
  @Get('dashboard')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query('farmId') farmId?: string,
  ) {
    return this.reportsService.getOwnerDashboard(req.user, farmId);
  }

  /**
   * MUST Mahine ka summary:
   * Doodh, billing, wasooli, category-wise kharcha, nafa.
   */
  @Get('monthly')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getMonthlySummary(
    @Req() req: AuthenticatedRequest,
    @Query('farmId') farmId?: string,
    @Query('month') month?: string,
  ) {
    return this.reportsService.getMonthlySummary(req.user, farmId, month);
  }

  /**
   * MUST Animal-wise report:
   * Har animal ka doodh, andaza amdani, kharcha, andaza nafa.
   * Behtareen aur kamzor animals.
   */
  @Get('animals')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getAnimalReport(
    @Req() req: AuthenticatedRequest,
    @Query('farmId') farmId?: string,
  ) {
    return this.reportsService.getAnimalWiseReport(req.user, farmId);
  }

  /**
   * MUST Customer-wise report:
   * Kis ko kitna doodh gaya, kitna baqaya.
   */
  @Get('customers')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getCustomerReport(
    @Req() req: AuthenticatedRequest,
    @Query('farmId') farmId?: string,
  ) {
    return this.reportsService.getCustomerWiseReport(req.user, farmId);
  }
}

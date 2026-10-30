import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user.entity.js';
import { OverviewService } from './overview.service.js';

@Controller('admin/overview')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getOverview() {
    return this.overviewService.getPlatformOverview();
  }
}

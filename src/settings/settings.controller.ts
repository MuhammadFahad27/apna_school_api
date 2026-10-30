import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user.entity.js';
import { UpdateFarmProfileDto, UpdateOwnerProfileDto } from './dto/index.js';
import { SettingsService } from './settings.service.js';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get farm profile, logo, default rate & history, shifts, and owner profile
   */
  @Get('farm')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getSettings(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getFarmSettings(req.user);
  }

  /**
   * Update farm profile (name, address, city, phone, logo, default rate, shifts)
   */
  @Patch('farm')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN)
  async updateFarm(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateFarmProfileDto,
  ) {
    return this.settingsService.updateFarmSettings(req.user, dto);
  }

  /**
   * Owner updates their own name, phone, and password
   */
  @Patch('profile')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WORKER)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateOwnerProfileDto,
  ) {
    return this.settingsService.updateOwnerProfile(req.user, dto);
  }

  /**
   * Data ownership: Download complete farm records export backup
   */
  @Get('export')
  @Roles(UserRole.FARM_OWNER, UserRole.ADMIN)
  async exportData(@Req() req: AuthenticatedRequest) {
    return this.settingsService.exportAllFarmData(req.user);
  }
}

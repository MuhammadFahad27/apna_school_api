import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user.entity.js';
import { CreateSupportRequestDto, ReplySupportRequestDto } from './dto/index.js';
import { SupportService } from './support.service.js';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Owner submits a new support request
   */
  @Post()
  @Roles(UserRole.FARM_OWNER)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSupportRequestDto,
  ) {
    return this.supportService.create(req.user, dto);
  }

  /**
   * Owner gets all their submitted support requests
   */
  @Get('my')
  @Roles(UserRole.FARM_OWNER)
  async getMyTickets(@Req() req: AuthenticatedRequest) {
    return this.supportService.findAllForOwner(req.user);
  }

  /**
   * Admin lists all platform support requests with search/filter
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  async getAllForAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.findAllForAdmin({ status, search, page, limit });
  }

  /**
   * Get single support ticket details
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FARM_OWNER)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.findOne(id, req.user);
  }

  /**
   * Admin replies to a support request, sending an email to the farm owner
   */
  @Post(':id/reply')
  @Roles(UserRole.ADMIN)
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReplySupportRequestDto,
  ) {
    return this.supportService.replyAsAdmin(id, req.user, dto);
  }

  /**
   * Admin permanently closes the support request
   */
  @Patch(':id/close')
  @Roles(UserRole.ADMIN)
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.closeAsAdmin(id, req.user);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { School } from './entities/school.entity.js';
import { User } from '../users/user.entity.js';

class UpdateSchoolProfileDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  theme_color?: string;
}

class UpdateUserProfileDto {
  name?: string;
  phone?: string;
  password?: string;
}

@Controller('school-profile')
@UseGuards(JwtAuthGuard)
export class SchoolProfileController {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  async getSchoolProfile(@Request() req: any) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('User does not belong to any school.');
    }
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new BadRequestException('School not found.');
    }
    return school;
  }

  @Patch()
  async updateSchoolProfile(
    @Request() req: any,
    @Body() dto: UpdateSchoolProfileDto,
  ) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('User does not belong to any school.');
    }

    const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
    if (!school) {
      throw new BadRequestException('School not found.');
    }

    if (dto.name?.trim()) school.name = dto.name.trim();
    if (dto.phone !== undefined) school.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) school.email = dto.email?.trim()?.toLowerCase() || null;
    if (dto.address !== undefined) school.address = dto.address?.trim() || null;
    if (dto.website !== undefined) school.website = dto.website?.trim() || null;
    if (dto.logo_url !== undefined) school.logo_url = dto.logo_url?.trim() || null;
    if (dto.theme_color?.trim()) school.theme_color = dto.theme_color.trim();

    const saved = await this.schoolRepo.save(school);
    return {
      message: 'School profile updated successfully.',
      school: saved,
    };
  }

  @Get('user')
  async getUserProfile(@Request() req: any) {
    const userId = req.user?.id;
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  @Patch('user')
  async updateUserProfile(
    @Request() req: any,
    @Body() dto: UpdateUserProfileDto,
  ) {
    const userId = req.user?.id;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (dto.name?.trim()) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() || user.phone;
    if (dto.password?.trim()) {
      if (dto.password.trim().length < 6) {
        throw new BadRequestException('Password must be at least 6 characters.');
      }
      user.passwordHash = await bcrypt.hash(dto.password.trim(), 12);
    }

    const saved = await this.userRepo.save(user);
    return {
      message: 'User profile updated successfully.',
      user: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        role: saved.role,
      },
    };
  }
}

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { LoginDto } from './dto/index.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';
import { SchoolStatus } from '../schools/entities/school.entity.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto) {
    const raw = (dto.identifier || dto.email || '').trim();
    if (!raw) {
      throw new UnauthorizedException('Phone number or email is required.');
    }

    // Try finding by phone or by email, including school relation
    const user = await this.users.findOne({
      where: [{ phone: raw }, { email: raw.toLowerCase() }],
      relations: { school: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.INACTIVE || !user.isActive) {
      const reason = user.suspensionReason
        ? ` Reason: ${user.suspensionReason}`
        : '';
      throw new UnauthorizedException(`Account is inactive.${reason}`);
    }

    // Block login if school is suspended (Super Admin is never blocked)
    if (user.role !== UserRole.SUPER_ADMIN && user.school) {
      if (user.school.status === SchoolStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your school subscription/account is currently suspended. Please contact platform administration.',
        );
      }
    }

    // Update user last login time
    user.lastLoginAt = new Date();
    await this.users.save(user);

    const schoolData = user.school
      ? {
          id: user.school.id,
          name: user.school.name,
          code: user.school.code,
          slug: user.school.slug,
          address: user.school.address,
          phone: user.school.phone,
          email: user.school.email,
          logo_url: user.school.logo_url,
          theme_color: user.school.theme_color,
          status: user.school.status,
          plan: user.school.plan,
        }
      : null;

    const payload = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      schoolId: user.school_id,
      school: schoolData,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '7d';

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        expiresIn: expiresIn as any,
      }),
      user: payload,
      expiresIn,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const raw = dto.email.trim().toLowerCase();
    if (!raw) {
      throw new BadRequestException('Email address is required.');
    }

    const user = await this.users.findOne({
      where: [{ email: raw }, { phone: raw }],
    });

    // Security practice: Return success message even if user not found to prevent user enumeration
    if (!user || !user.email) {
      return {
        message:
          'If an account exists with this email address, a password reset link has been sent.',
      };
    }

    // Generate token valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000);
    await this.users.save(user);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailService.sendPasswordResetLink({
        email: user.email,
        name: user.name || 'User',
        resetUrl,
      });
    } catch (err) {
      console.error('Failed to send password reset email:', err);
    }

    return {
      message:
        'If an account exists with this email address, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.token || !dto.newPassword) {
      throw new BadRequestException('Token and new password are required.');
    }

    const user = await this.users.findOne({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset link. Please request a new one.',
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.users.save(user);

    return {
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}

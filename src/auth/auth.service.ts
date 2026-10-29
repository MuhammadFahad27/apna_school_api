import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from './dto/index.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';
import { Farm, FarmStatus } from '../farms/farm.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Farm) private readonly farms: Repository<Farm>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const raw = (dto.identifier || dto.email || '').trim();
    if (!raw) {
      throw new UnauthorizedException('Phone number or email is required.');
    }

    // Try finding by phone or by email
    const user = await this.users.findOne({
      where: [{ phone: raw }, { email: raw.toLowerCase() }],
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

    let farmId: string | undefined;

    // If user is a farm owner, verify the farm is not inactive
    if (user.role === UserRole.FARM_OWNER) {
      const farm = await this.farms.findOne({ where: { ownerId: user.id } });
      if (farm) {
        farmId = farm.id;
        if (farm.status === FarmStatus.INACTIVE) {
          const reason = farm.suspensionReason
            ? ` Reason: ${farm.suspensionReason}`
            : '';
          throw new UnauthorizedException(`Organization is inactive.${reason}`);
        }
      }
    }

    const payload = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      farmId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
    };
  }
}

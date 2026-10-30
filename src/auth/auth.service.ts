import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/index.js';
import { Employee } from '../farms/employee.entity.js';
import { Farm, FarmStatus } from '../farms/farm.entity.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Farm) private readonly farms: Repository<Farm>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
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
    let employeeId: string | undefined;

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
    } else if (
      user.role === UserRole.MANAGER ||
      user.role === UserRole.WORKER
    ) {
      // If user is staff, find their employee record
      const employee = await this.employees.findOne({
        where: [{ userId: user.id }, { phone: user.phone || '' }],
        relations: { farm: true },
      });

      if (!employee || !employee.isActive) {
        throw new UnauthorizedException('Staff member account is inactive.');
      }

      if (employee.farm?.status === FarmStatus.INACTIVE) {
        throw new UnauthorizedException('Farm organization is inactive.');
      }

      farmId = employee.farmId;
      employeeId = employee.id;

      // Update employee last login time
      employee.lastLoginAt = new Date();
      await this.employees.save(employee);
    }

    // Update user last login time
    user.lastLoginAt = new Date();
    await this.users.save(user);

    const payload = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      farmId,
      employeeId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
    };
  }
}

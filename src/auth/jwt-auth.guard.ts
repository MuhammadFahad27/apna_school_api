import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/user.entity.js';
import { SchoolStatus } from '../schools/entities/school.entity.js';
import type { AuthenticatedRequest, AuthUser } from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    try {
      const payload = this.jwtService.verify<AuthUser>(token);

      // Instant token invalidation if account or school is deactivated/suspended
      const user = await this.users.findOne({
        where: { id: payload.id },
        relations: { school: true },
      });

      if (!user || !user.isActive || user.status === UserStatus.INACTIVE) {
        throw new UnauthorizedException('Account has been deactivated.');
      }

      if (
        user.role !== UserRole.SUPER_ADMIN &&
        user.school &&
        user.school.status === SchoolStatus.SUSPENDED
      ) {
        throw new UnauthorizedException('School subscription has been suspended.');
      }

      request.user = {
        ...payload,
        role: user.role,
        schoolId: user.school_id || payload.schoolId,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}

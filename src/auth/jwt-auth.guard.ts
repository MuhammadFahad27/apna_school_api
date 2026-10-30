import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/user.entity.js';
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

      // Instant token invalidation if account is deactivated
      const user = await this.users.findOne({
        where: { id: payload.id },
        select: {
          id: true,
          isActive: true,
          status: true,
          role: true,
          phone: true,
          email: true,
          name: true,
        },
      });

      if (!user || !user.isActive || user.status === UserStatus.INACTIVE) {
        throw new UnauthorizedException('Account has been deactivated.');
      }

      request.user = {
        ...payload,
        role: user.role,
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

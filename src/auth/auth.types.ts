import { UserRole } from '../users/user.entity.js';
import type { Request } from 'express';

export type AuthUser = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email: string | null;
  role: UserRole;
  farmId?: string;
  employeeId?: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

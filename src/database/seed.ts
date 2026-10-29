import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import dataSource from './data-source.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

async function seed(): Promise<void> {
  const config = new ConfigService();
  const email = config.get<string>('ADMIN_EMAIL');
  const password = config.get<string>('ADMIN_PASSWORD');

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured.');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  await dataSource.initialize();
  const users = dataSource.getRepository(User);

  // Check for any existing admin user or user with this email
  const existingAdmins = await users.find({
    where: [{ role: UserRole.ADMIN }, { email: normalizedEmail }],
    order: { createdAt: 'ASC' },
  });

  if (existingAdmins.length > 0) {
    // 1. Prefer the account that already has the target email, otherwise use the first admin
    const primaryAdmin =
      existingAdmins.find((u) => u.email?.toLowerCase() === normalizedEmail) ||
      existingAdmins[0];

    // 2. Identify any other admin accounts as duplicates
    const duplicates = existingAdmins.filter((u) => u.id !== primaryAdmin.id);

    // 3. Remove duplicate accounts FIRST to eliminate unique constraint collisions on email
    if (duplicates.length > 0) {
      await users.remove(duplicates);
      console.log(`Cleaned up ${duplicates.length} duplicate admin account(s).`);
    }

    // 4. Safely update the primary admin
    primaryAdmin.email = normalizedEmail;
    primaryAdmin.passwordHash = passwordHash;
    primaryAdmin.role = UserRole.ADMIN;
    primaryAdmin.isActive = true;
    primaryAdmin.status = UserStatus.ACTIVE;
    if (!primaryAdmin.name) {
      primaryAdmin.name = 'System Administrator';
    }

    await users.save(primaryAdmin);
    console.log(`Admin user (${primaryAdmin.id}) successfully updated with email "${normalizedEmail}" and new password.`);
    return;
  }

  // Create single admin user if none exists
  await users.save({
    name: 'System Administrator',
    email: normalizedEmail,
    passwordHash,
    role: UserRole.ADMIN,
    isActive: true,
    status: UserStatus.ACTIVE,
  });
  console.log(`Admin user created for "${normalizedEmail}".`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

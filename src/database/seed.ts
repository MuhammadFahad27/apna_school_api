import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import dataSource from './data-source.js';
import { User, UserRole } from '../users/user.entity.js';

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

  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const existing = await users.findOne({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    console.log(`Admin already exists for ${email.toLowerCase()}.`);
    return;
  }

  await users.save({
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: UserRole.ADMIN,
    isActive: true,
  });
  console.log(`Admin created for ${email.toLowerCase()}.`);
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

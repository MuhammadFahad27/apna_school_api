import 'reflect-metadata';
import dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function seed(): Promise<void> {
  console.log('--- Starting Super Admin Seed (Safe Upsert) ---');

  await dataSource.initialize();
  console.log('✓ Database connection established.');

  const usersRepo = dataSource.getRepository(User);

  // =========================================================================
  // SAFE SINGLETON SUPER ADMIN UPSERT (Does NOT wipe existing data)
  // =========================================================================
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '';
  const superAdminName = process.env.SUPER_ADMIN_NAME?.trim() || 'Platform Super Admin';
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE?.trim() || '+923000000000';

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in your .env file.',
    );
  }

  if (superAdminPassword.length < 6) {
    throw new Error('SUPER_ADMIN_PASSWORD in .env must be at least 6 characters long.');
  }

  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);

  // 1. Check for any existing super_admin accounts
  const allSuperAdmins = await usersRepo.find({
    where: { role: UserRole.SUPER_ADMIN },
    order: { createdAt: 'ASC' },
  });

  // 2. Check if a user with this email already exists
  const userWithEmail = await usersRepo.findOne({
    where: { email: superAdminEmail },
  });

  // 3. Check if a user with this phone already exists
  const userWithPhone = await usersRepo.findOne({
    where: { phone: superAdminPhone },
  });

  // Identify the target Super Admin record
  const primarySuperAdmin =
    userWithEmail ||
    allSuperAdmins[0] ||
    userWithPhone ||
    usersRepo.create();

  // If there are duplicate/placeholder super_admin accounts, remove extras
  const extraSuperAdmins = allSuperAdmins.filter((u) => u.id !== primarySuperAdmin.id);
  if (extraSuperAdmins.length > 0) {
    await usersRepo.remove(extraSuperAdmins);
    console.log(`✓ Removed ${extraSuperAdmins.length} redundant super_admin record(s).`);
  }

  // If a DIFFERENT user record currently holds the phone, release the phone
  if (userWithPhone && userWithPhone.id !== primarySuperAdmin.id) {
    userWithPhone.phone = null;
    await usersRepo.save(userWithPhone);
    console.log(`✓ Released phone ${superAdminPhone} from conflicting account.`);
  }

  // UPDATE the single Super Admin record
  primarySuperAdmin.name = superAdminName;
  primarySuperAdmin.email = superAdminEmail;
  primarySuperAdmin.phone = superAdminPhone;
  primarySuperAdmin.passwordHash = superAdminHash;
  primarySuperAdmin.role = UserRole.SUPER_ADMIN;
  primarySuperAdmin.isActive = true;
  primarySuperAdmin.status = UserStatus.ACTIVE;
  primarySuperAdmin.school_id = null;

  await usersRepo.save(primarySuperAdmin);

  console.log(`✓ Super Admin record verified/updated (ID: ${primarySuperAdmin.id}):`);
  console.log(`   Name:     ${primarySuperAdmin.name}`);
  console.log(`   Email:    ${primarySuperAdmin.email}`);
  console.log(`   Phone:    ${primarySuperAdmin.phone}`);
  console.log(`   Role:     ${primarySuperAdmin.role}`);
  console.log('--- Super Admin Seed Completed Successfully ---');
}

seed()
  .catch((error: unknown) => {
    console.error('Seed execution error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

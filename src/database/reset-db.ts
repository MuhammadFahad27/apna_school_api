import 'reflect-metadata';
import dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function resetDatabase(): Promise<void> {
  console.log('==============================================');
  console.log('       ONE-TIME DATABASE RESET & CLEAN WIPE    ');
  console.log('==============================================');

  await dataSource.initialize();
  console.log('✓ Database connection established.');

  const tablesToWipe = [
    'payslips',
    'pay_runs',
    'fee_vouchers',
    'student_fees',
    'expenses',
    'expense_categories',
    'subject_teacher_assignments',
    'section_subjects',
    'class_teacher_assignments',
    'student_enrollments',
    'students',
    'teachers',
    'staff',
    'sections',
    'subjects',
    'classes',
    'schools',
    'users',
  ];

  console.log('🧹 Truncating all business & user tables...');
  for (const table of tablesToWipe) {
    try {
      await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`   ✓ Wiped: ${table}`);
    } catch (err: any) {
      console.log(`   - Skipped ${table}: ${err.message}`);
    }
  }

  // Seed fresh Super Admin
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@yopmail.com').trim().toLowerCase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';
  const superAdminName = process.env.SUPER_ADMIN_NAME?.trim() || 'Muhammad Fahad Ashraf';
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE?.trim() || '+923000000000';

  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
  const usersRepo = dataSource.getRepository(User);

  const superAdmin = usersRepo.create({
    name: superAdminName,
    email: superAdminEmail,
    phone: superAdminPhone,
    passwordHash: superAdminHash,
    role: UserRole.SUPER_ADMIN,
    isActive: true,
    status: UserStatus.ACTIVE,
    school_id: null,
  });

  await usersRepo.save(superAdmin);

  console.log('==============================================');
  console.log('✓ Database completely cleaned! Fresh Super Admin ready:');
  console.log(`   Name:     ${superAdmin.name}`);
  console.log(`   Email:    ${superAdmin.email}`);
  console.log(`   Phone:    ${superAdmin.phone}`);
  console.log(`   Role:     ${superAdmin.role}`);
  console.log('==============================================');
}

resetDatabase()
  .catch((err) => {
    console.error('Reset error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

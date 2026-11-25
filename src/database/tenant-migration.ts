import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source.js';

async function runTenantMigration() {
  console.log('--- Starting Multi-Tenant Database Migration ---');
  await dataSource.initialize();

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Enums
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schools_status_enum') THEN
          CREATE TYPE schools_status_enum AS ENUM ('active', 'suspended', 'trial');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schools_plan_enum') THEN
          CREATE TYPE schools_plan_enum AS ENUM ('starter', 'standard', 'premium');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'super_admin';
        END IF;
      END $$;
    `);

    // 2. Schools Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        code varchar(100) UNIQUE NOT NULL,
        slug varchar(150) UNIQUE NOT NULL,
        address text,
        phone varchar(50),
        email varchar(150),
        website varchar(255),
        logo_url text,
        theme_color varchar(30) DEFAULT '#0c3a2b',
        status schools_status_enum DEFAULT 'active',
        plan schools_plan_enum DEFAULT 'standard',
        max_students int DEFAULT 500,
        max_teachers int DEFAULT 50,
        subscription_end_date timestamptz,
        notes text,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
      );
    `);
    console.log('✓ Schools table verified/created.');

    // 3. Default School Seed (Al Harmain School System)
    const defaultSchoolId = 'a0000000-0000-0000-0000-000000000001';
    await queryRunner.query(`
      INSERT INTO schools (
        id, name, code, slug, address, phone, email, status, plan, max_students, max_teachers, created_at, updated_at
      ) VALUES (
        '${defaultSchoolId}',
        'Al Harmain School System',
        'ALH-001',
        'al-harmain',
        'R-114, Shah Town Phase-1, Bin Qasim Town, Karachi',
        '+923063529347',
        'info@alharmain.edu.pk',
        'active',
        'standard',
        1000,
        100,
        NOW(),
        NOW()
      ) ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        updated_at = NOW();
    `);
    console.log('✓ Default School (Al Harmain School System) verified.');

    // 4. Alter Users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetPasswordToken" varchar;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetPasswordExpires" timestamptz;
    `);
    console.log('✓ Users table columns added.');

    // 5. Add school_id to all business entities
    const tables = [
      'students',
      'teachers',
      'staff',
      'classes',
      'sections',
      'subjects',
      'student_fees',
      'fee_vouchers',
      'pay_runs',
      'payslips',
      'expenses',
      'expense_categories',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
            ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
            UPDATE ${table} SET school_id = '${defaultSchoolId}' WHERE school_id IS NULL;
          END IF;
        END $$;
      `);
      console.log(`✓ Table '${table}' linked with school_id.`);
    }

    // 6. Link existing admin/principal users to the default school
    await queryRunner.query(`
      UPDATE users SET school_id = '${defaultSchoolId}'
      WHERE role != 'super_admin' AND school_id IS NULL;
    `);

    // 7. Seed or update Super Admin Account from environment variables
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@edusaas.com').trim().toLowerCase();
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE || '+923000000000';
    const rawPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const existingSuperAdmin = await queryRunner.query(`
      SELECT id FROM users WHERE email = '${superAdminEmail}' OR phone = '${superAdminPhone}' OR role = 'super_admin' LIMIT 1;
    `);

    if (existingSuperAdmin.length > 0) {
      await queryRunner.query(`
        UPDATE users SET
          name = 'Platform Super Admin',
          email = '${superAdminEmail}',
          phone = '${superAdminPhone}',
          "passwordHash" = '${passwordHash}',
          role = 'super_admin',
          "isActive" = true,
          status = 'active',
          school_id = NULL
        WHERE id = '${existingSuperAdmin[0].id}';
      `);
      console.log(`✓ Super Admin user updated: ${superAdminEmail}`);
    } else {
      await queryRunner.query(`
        INSERT INTO users (
          id, name, phone, email, "passwordHash", role, "isActive", status, school_id, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          'Platform Super Admin',
          '${superAdminPhone}',
          '${superAdminEmail}',
          '${passwordHash}',
          'super_admin',
          true,
          'active',
          NULL,
          NOW(),
          NOW()
        );
      `);
      console.log(`✓ Super Admin user created: ${superAdminEmail} / SuperAdmin123!`);
    }

    console.log('--- Multi-Tenant Migration Finished Successfully ✓ ---');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

runTenantMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config.js';
import { DatabaseHealthController } from './database-health.controller.js';
import { DatabaseHealthService } from './database-health.service.js';
import { User } from '../users/user.entity.js';
import { School } from '../schools/entities/school.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Subject } from '../subjects/entities/subject.entity.js';
import { StudentEnrollment } from '../classes/entities/student-enrollment.entity.js';
import { ClassTeacherAssignment } from '../classes/entities/class-teacher-assignment.entity.js';
import { SectionSubject } from '../classes/entities/section-subject.entity.js';
import { SubjectTeacherAssignment } from '../classes/entities/subject-teacher-assignment.entity.js';
import { StudentFee } from '../fees/entities/student-fee.entity.js';
import { FeeVoucher } from '../fees/entities/fee-voucher.entity.js';
import { PayRun } from '../payroll/entities/pay-run.entity.js';
import { Payslip } from '../payroll/entities/payslip.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { Expense } from '../expenses/entities/expense.entity.js';
import { ExpenseCategory } from '../expenses/entities/expense-category.entity.js';

const databaseLogger = new Logger('Database');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createDatabaseOptions(config),
        entities: [
          School,
          User,
          Class,
          Section,
          Teacher,
          Student,
          Subject,
          StudentEnrollment,
          ClassTeacherAssignment,
          SectionSubject,
          SubjectTeacherAssignment,
          StudentFee,
          FeeVoucher,
          PayRun,
          Payslip,
          Staff,
          Expense,
          ExpenseCategory,
        ],
      }),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Database connection options were not created.');
        }

        const dataSource = new DataSource(options);
        const maxRetries = 8;
        let attempt = 0;

        while (attempt < maxRetries) {
          try {
            await dataSource.initialize();
            // Warm-up ping so Neon endpoint is fully awake before first request
            await dataSource.query('SELECT 1');
            databaseLogger.log('PostgreSQL database connection established ✓');
            return dataSource;
          } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
              databaseLogger.error(
                'PostgreSQL database connection failed after all retries',
                error instanceof Error ? error.stack : String(error),
              );
              throw error;
            }
            // Exponential backoff: 2s, 4s, 6s ... max 10s
            const delay = Math.min(2000 * attempt, 10000);
            databaseLogger.warn(
              `Database connection attempt ${attempt}/${maxRetries} failed (Neon waking up...). Retrying in ${delay / 1000}s...`,
            );
            // Destroy partially-initialized dataSource before retry
            if (dataSource.isInitialized) {
              await dataSource.destroy().catch(() => {});
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        return dataSource;
      },
    }),
  ],
  controllers: [DatabaseHealthController],
  providers: [DatabaseHealthService],
})
export class DatabaseModule {}

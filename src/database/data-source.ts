import 'reflect-metadata';
import dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
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
import { PayRun } from '../payroll/entities/pay-run.entity.js';
import { Payslip } from '../payroll/entities/payslip.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { Expense } from '../expenses/entities/expense.entity.js';
import { ExpenseCategory } from '../expenses/entities/expense-category.entity.js';
import { createDatabaseOptions } from './database.config.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

const config = new ConfigService();
const databaseOptions = createDatabaseOptions(config);

const options: DataSourceOptions = {
  type: 'postgres',
  url: databaseOptions.url,
  ssl: databaseOptions.ssl,
  extra: databaseOptions.extra,
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
    PayRun,
    Payslip,
    Staff,
    Expense,
    ExpenseCategory,
  ],
  migrations: ['dist/database/migrations/*.js'],
};

export default new DataSource(options);

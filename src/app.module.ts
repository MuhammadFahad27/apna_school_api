import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { SectionsModule } from './sections/sections.module.js';
import { TeachersModule } from './teachers/teachers.module.js';
import { StudentsModule } from './students/students.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { FeesModule } from './fees/fees.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { StaffModule } from './staff/staff.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { CloudinaryModule } from './cloudinary/cloudinary.module.js';
import { DatabaseModule } from './database/database.module.js';
import { MailModule } from './mail/mail.module.js';
import { SchoolsModule } from './schools/schools.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'src/.env'],
    }),
    DatabaseModule,
    CloudinaryModule,
    MailModule,
    SchoolsModule,
    AuthModule,
    ClassesModule,
    SectionsModule,
    TeachersModule,
    StudentsModule,
    SubjectsModule,
    FeesModule,
    PayrollModule,
    StaffModule,
    ExpensesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

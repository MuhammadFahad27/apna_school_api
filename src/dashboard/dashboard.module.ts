import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/entities/student.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { Class } from '../classes/entities/class.entity.js';
import { StudentFee } from '../fees/entities/student-fee.entity.js';
import { Expense } from '../expenses/entities/expense.entity.js';
import { Payslip } from '../payroll/entities/payslip.entity.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Teacher,
      Staff,
      Class,
      StudentFee,
      Expense,
      Payslip,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

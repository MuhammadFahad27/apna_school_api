import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity.js';
import { ExpenseCategory } from './entities/expense-category.entity.js';
import { StudentFee } from '../fees/entities/student-fee.entity.js';
import { Payslip } from '../payroll/entities/payslip.entity.js';
import { ExpensesService } from './expenses.service.js';
import { ExpensesController } from './expenses.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseCategory, StudentFee, Payslip]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}

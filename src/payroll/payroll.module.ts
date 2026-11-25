import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayRun } from './entities/pay-run.entity.js';
import { Payslip } from './entities/payslip.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PayRun, Payslip, Teacher])],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService, TypeOrmModule],
})
export class PayrollModule {}

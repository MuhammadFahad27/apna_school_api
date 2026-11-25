import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PayrollService } from './payroll.service.js';
import { GeneratePayrollDto } from './dto/generate-payroll.dto.js';
import { EditPayslipDto } from './dto/edit-payslip.dto.js';
import { QueryPayslipsDto } from './dto/query-payslips.dto.js';
import { QueryPayRunsDto } from './dto/query-pay-runs.dto.js';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // 1. Check teacher eligibility & duplicates for a given month/year
  @Get('eligibility')
  checkEligibility(
    @Query('month') month: string,
    @Query('year') year: number,
  ) {
    return this.payrollService.checkEligibility(month, year);
  }

  // 2. Generate Payroll Batch (Pay Run + Payslips)
  @Post('generate')
  generatePayroll(@Body() dto: GeneratePayrollDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.payrollService.generatePayroll(dto, userId);
  }

  // 3. List Pay Runs
  @Get('pay-runs')
  findAllPayRuns(@Query() query: QueryPayRunsDto) {
    return this.payrollService.findAllPayRuns(query);
  }

  // 4. Get Single Pay Run with Payslips
  @Get('pay-runs/:id')
  findOnePayRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.findOnePayRun(id);
  }

  // 5. Bulk Payment: Mark all unpaid in pay run as PAID
  @Post('pay-runs/:id/pay-all')
  bulkPayPayRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.bulkPayPayRun(id);
  }

  // 6. List Payslips (with Search, Month, Year, Status, etc.)
  @Get('payslips')
  findAllPayslips(@Query() query: QueryPayslipsDto) {
    return this.payrollService.findAllPayslips(query);
  }

  // 7. Overall Stats
  @Get('stats')
  getStats() {
    return this.payrollService.getStats();
  }

  // 8. Get Single Payslip (Printable view)
  @Get('payslips/:id')
  findOnePayslip(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.findOnePayslip(id);
  }

  // 9. Edit Payslip (Bonus, Deductions) - ONLY UNPAID
  @Patch('payslips/:id')
  editPayslip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditPayslipDto,
  ) {
    return this.payrollService.editPayslip(id, dto);
  }

  // 10. Individual Payment: Mark Payslip as PAID
  @Post('payslips/:id/pay')
  markPayslipAsPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.markPayslipAsPaid(id);
  }

  // 11. Delete / Void Payslip
  @Delete('payslips/:id')
  deletePayslip(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('void') forceVoid?: string,
  ) {
    return this.payrollService.deletePayslip(id, forceVoid === 'true');
  }
}

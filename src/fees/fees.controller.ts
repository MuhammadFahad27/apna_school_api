import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { FeesService } from './fees.service.js';
import { CollectFeeDto } from './dto/collect-fee.dto.js';
import { QueryFeeStudentsDto } from './dto/query-fee-students.dto.js';
import { GenerateVouchersDto } from './dto/generate-vouchers.dto.js';

@Controller('fees')
@UseGuards(JwtAuthGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // 1. List students with fee status for selected month/year with search & filters
  @Get('students')
  getStudentsWithFeeStatus(@Query() query: QueryFeeStudentsDto) {
    return this.feesService.getStudentsWithFeeStatus(query);
  }

  // 2. Fee statistics (Expected, Collected, Pending, etc.)
  @Get('stats')
  getFeeStats(
    @Query('month') month?: string,
    @Query('year') year?: number,
  ) {
    return this.feesService.getFeeStats(month, year);
  }

  // 3. 12-Month Fee Ledger for a specific student
  @Get('students/:studentId/ledger')
  getStudentFeeLedger(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('year') year?: number,
    @Query('session') session?: string,
  ) {
    return this.feesService.getStudentFeeLedger(studentId, year, session);
  }

  // 4. Collect Fee (Mark as Paid)
  @Post('collect')
  collectFee(@Body() dto: CollectFeeDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.feesService.collectFee(dto, userId);
  }

  // 5. Revert Fee (Mark as Unpaid)
  @Post('revert/:feeId')
  revertFee(@Param('feeId', ParseUUIDPipe) feeId: string) {
    return this.feesService.revertFee(feeId);
  }

  // 6. List Created Fee Vouchers for selected month & year
  @Get('vouchers')
  getVouchers(
    @Query('month') month?: string,
    @Query('year') year?: number,
    @Query('class_id') classId?: string,
    @Query('section_id') sectionId?: string,
    @Query('search') search?: string,
  ) {
    return this.feesService.getFeeVouchers(month, year, classId, sectionId, search);
  }

  // 7. Generate & Save 3-Copy Fee Vouchers (Single or Class-wise Bulk)
  @Post('vouchers/generate')
  generateVouchers(@Body() dto: GenerateVouchersDto) {
    return this.feesService.generateFeeVouchers(dto);
  }

  // 8. Delete Fee Voucher (Hard Delete)
  @Delete('vouchers')
  deleteVoucher(
    @Query('student_id') studentId?: string,
    @Query('month') month?: string,
    @Query('year') year?: number,
    @Query('id') voucherId?: string,
  ) {
    return this.feesService.deleteFeeVoucher(studentId, month, year, voucherId);
  }
}

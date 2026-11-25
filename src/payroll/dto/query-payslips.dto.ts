import { IsOptional, IsString } from 'class-validator';

export class QueryPayslipsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  year?: number;

  @IsOptional()
  @IsString()
  payment_status?: string; // all, unpaid, paid, void

  @IsOptional()
  @IsString()
  pay_run_id?: string;
}

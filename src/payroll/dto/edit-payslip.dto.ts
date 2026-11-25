import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class EditPayslipDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Bonus amount cannot be negative.' })
  @Type(() => Number)
  bonus_amount?: number;

  @IsOptional()
  @IsString()
  bonus_reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Deduction amount cannot be negative.' })
  @Type(() => Number)
  deduction_amount?: number;

  @IsOptional()
  @IsString()
  deduction_reason?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CollectFeeDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Student ID is required.' })
  student_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'Month is required.' })
  month!: string; // e.g. November

  @IsNumber()
  @IsNotEmpty({ message: 'Year is required.' })
  @Type(() => Number)
  year!: number; // e.g. 2026

  @IsString()
  @IsOptional()
  academic_session?: string;

  @IsNumber({}, { message: 'Paid amount must be a number.' })
  @Min(0, { message: 'Paid amount cannot be negative.' })
  @Type(() => Number)
  paid_amount!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @IsDateString()
  @IsOptional()
  payment_date?: string;

  @IsString()
  @IsNotEmpty({ message: 'Payment method is required.' })
  payment_method!: string; // cash, bank_transfer, online, etc.

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  extra_charges?: number;

  @IsString()
  @IsOptional()
  extra_charges_reason?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

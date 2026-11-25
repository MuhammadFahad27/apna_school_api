import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomFeeHeadDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class GenerateVouchersDto {
  @IsOptional()
  @IsString()
  class_id?: string;

  @IsOptional()
  @IsString()
  section_id?: string;

  @IsOptional()
  @IsString()
  student_id?: string;

  @IsNotEmpty({ message: 'Month is required.' })
  @IsString()
  month!: string; // e.g. August

  @IsNotEmpty({ message: 'Year is required.' })
  @Type(() => Number)
  @IsInt()
  year!: number; // e.g. 2026

  @IsNotEmpty({ message: 'Issue date is required.' })
  @IsString()
  issue_date!: string; // YYYY-MM-DD

  @IsNotEmpty({ message: 'Due date is required.' })
  @IsString()
  due_date!: string; // YYYY-MM-DD

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  late_fee?: number = 100;

  @IsOptional()
  @IsString()
  bank_name?: string = 'School Cash Counter / Allied Bank';

  @IsOptional()
  @IsString()
  account_title?: string = 'Al Harmain School System';

  @IsOptional()
  @IsString()
  account_no?: string = '1122-3344-5566-77';

  @IsOptional()
  @IsString()
  branch_note?: string = 'Shah Town Branch, Bin Qasim Town, Karachi';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFeeHeadDto)
  custom_heads?: CustomFeeHeadDto[];
}

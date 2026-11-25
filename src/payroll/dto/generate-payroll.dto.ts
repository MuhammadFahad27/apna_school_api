import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePayrollDto {
  @IsString()
  @IsNotEmpty({ message: 'Payroll month is required.' })
  month!: string; // e.g. August

  @IsNumber()
  @IsNotEmpty({ message: 'Payroll year is required.' })
  @Type(() => Number)
  year!: number; // e.g. 2026

  @IsArray({ message: 'Teacher IDs must be an array.' })
  @IsUUID('4', { each: true, message: 'Each teacher ID must be a valid UUID.' })
  teacher_ids!: string[];
}

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DutyShift, EmployeeRole } from '../../farms/employee.entity.js';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString({ message: 'Full name must be a valid text string.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a valid string.' })
  phone?: string;

  @IsOptional()
  @IsEnum(EmployeeRole, {
    message: 'Role must be either "manager" or "worker".',
  })
  role?: EmployeeRole;

  @IsOptional()
  @IsEnum(DutyShift, {
    message: 'Duty shift must be "morning", "evening", or "both".',
  })
  dutyShift?: DutyShift;

  @IsOptional()
  @IsString({ message: 'Joining date must be a valid date string.' })
  joiningDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Base salary must be a valid number.' })
  @Min(0, { message: 'Base salary cannot be negative.' })
  baseSalary?: number;

  @IsOptional()
  @IsString({ message: 'Profile picture URL must be a valid string.' })
  photoUrl?: string;

  @IsOptional()
  @IsString({ message: 'Emergency contact must be a valid string.' })
  emergencyContact?: string;

  @IsOptional()
  @IsString({ message: 'CNIC must be a valid string.' })
  cnic?: string;
}

import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DutyShift, EmployeeRole } from '../../farms/employee.entity.js';

export class CreateEmployeeDto {
  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString({ message: 'Full name must be a valid text string.' })
  name!: string;

  @IsNotEmpty({ message: 'Phone number is required as login ID.' })
  @IsString({ message: 'Phone number must be a valid string.' })
  phone!: string;

  @IsNotEmpty({ message: 'Role (Manager or Worker) is required.' })
  @IsEnum(EmployeeRole, {
    message: 'Role must be either "manager" or "worker".',
  })
  role!: EmployeeRole;

  @IsNotEmpty({ message: 'Duty shift is required.' })
  @IsEnum(DutyShift, {
    message: 'Duty shift must be "morning", "evening", or "both".',
  })
  dutyShift!: DutyShift;

  @IsNotEmpty({ message: 'Joining date is required.' })
  @IsString({ message: 'Joining date must be a valid date string.' })
  joiningDate!: string;

  @IsNotEmpty({ message: 'Base monthly salary is required.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Base salary must be a valid number.' })
  @Min(0, { message: 'Base salary cannot be negative.' })
  baseSalary!: number;

  @IsNotEmpty({
    message: 'Profile picture is required and must be uploaded to Cloudinary.',
  })
  @IsString({ message: 'Profile picture URL must be a valid string.' })
  photoUrl!: string;

  @IsNotEmpty({ message: 'Emergency contact information is required.' })
  @IsString({ message: 'Emergency contact must be a valid string.' })
  emergencyContact!: string;

  @IsOptional()
  @IsString({ message: 'CNIC must be a valid string.' })
  cnic?: string;

  @IsOptional()
  @IsString()
  farmId?: string;
}

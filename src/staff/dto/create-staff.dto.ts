import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  StaffEmploymentStatus,
  StaffEmploymentType,
  StaffGender,
} from '../entities/staff.entity.js';

export class CreateStaffDto {
  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString()
  full_name!: string;

  @IsOptional()
  @IsString()
  father_or_husband_name?: string;

  @IsOptional()
  @IsString()
  cnic_number?: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsString()
  phone_number!: string;

  @IsNotEmpty({ message: 'Gender is required.' })
  @IsEnum(StaffGender)
  gender!: StaffGender;

  @IsNotEmpty({ message: 'Role or designation is required.' })
  @IsString()
  role_title!: string;

  @IsOptional()
  @IsEnum(StaffEmploymentStatus)
  employment_status?: StaffEmploymentStatus;

  @IsOptional()
  @IsEnum(StaffEmploymentType)
  employment_type?: StaffEmploymentType;

  @IsOptional()
  @IsString()
  joining_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  base_salary?: number;

  @IsOptional()
  @IsString()
  home_address?: string;

  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  emergency_contact_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

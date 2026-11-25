import {
  IsEnum,
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

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  father_or_husband_name?: string;

  @IsOptional()
  @IsString()
  cnic_number?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsEnum(StaffGender)
  gender?: StaffGender;

  @IsOptional()
  @IsString()
  role_title?: string;

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

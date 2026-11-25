import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Designation,
  EmploymentStatus,
  EmploymentType,
  Gender,
} from '../entities/teacher.entity.js';

export class UpdateTeacherDto {
  // A. Personal Information
  @IsString()
  @IsOptional()
  @MaxLength(50)
  employee_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  full_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  father_name?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone_number?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsOptional()
  profile_picture?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  cnic_number?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // B. Professional Information
  @IsString()
  @IsOptional()
  @MaxLength(150)
  qualification?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  specialization?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  experience_years?: number;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  previous_school?: string;

  @IsOptional()
  @IsEnum(Designation)
  designation?: Designation;

  @IsDateString()
  @IsOptional()
  joining_date?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employment_type?: EmploymentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  base_salary?: number;

  // C. Employment Information
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employment_status?: EmploymentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  probation_period?: number;

  @IsDateString()
  @IsOptional()
  confirmation_date?: string;

  @IsDateString()
  @IsOptional()
  contract_end_date?: string;

  @IsDateString()
  @IsOptional()
  resignation_date?: string;

  @IsString()
  @IsOptional()
  leaving_reason?: string;

  // D. Additional Information
  @IsString()
  @IsOptional()
  @MaxLength(100)
  emergency_contact_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  emergency_contact_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  emergency_contact_relation?: string;

  @IsOptional()
  @IsArray()
  qualification_documents?: Array<{ name: string; url: string }>;

  @IsOptional()
  @IsArray()
  experience_certificates?: Array<{ name: string; url: string }>;

  @IsString()
  @IsOptional()
  remarks?: string;
}

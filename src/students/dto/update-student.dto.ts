import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  StudentGender,
  StudentStatus,
} from '../entities/student.entity.js';

export class UpdateStudentDto {
  // 1. Personal Information
  @IsString()
  @IsOptional()
  @MaxLength(30)
  student_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  admission_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  first_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  last_name?: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(StudentGender)
  gender?: StudentGender;

  @IsString()
  @IsOptional()
  profile_picture?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  blood_group?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  // 2. Parent / Guardian Information
  @IsString()
  @IsOptional()
  @MaxLength(100)
  father_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  father_contact_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  father_occupation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  mother_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  mother_contact_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  guardian_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  guardian_relation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  emergency_contact_number?: string;

  // 3. Academic Information
  @IsDateString()
  @IsOptional()
  admission_date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  academic_session?: string;

  @IsUUID()
  @IsOptional()
  class_id?: string;

  @IsUUID()
  @IsOptional()
  section_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  previous_school?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  previous_class?: string;

  @IsString()
  @IsOptional()
  previous_academic_record?: string;

  @IsOptional()
  @IsEnum(StudentStatus)
  student_status?: StudentStatus;

  @IsOptional()
  @IsNumber({}, { message: 'Monthly fee must be a valid number.' })
  @Min(0, { message: 'Monthly fee cannot be negative.' })
  @Type(() => Number)
  monthly_fee?: number;

  // 4. Address Information
  @IsString()
  @IsOptional()
  @MaxLength(50)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;

  @IsString()
  @IsOptional()
  complete_address?: string;

  // 5. Additional Information
  @IsString()
  @IsOptional()
  medical_notes?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsOptional()
  @IsArray()
  previous_school_documents?: Array<{ name: string; url: string }>;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  birth_certificate_or_bform?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

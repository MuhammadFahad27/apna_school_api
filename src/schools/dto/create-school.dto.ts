import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SchoolStatus, SubscriptionPlan } from '../entities/school.entity.js';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsOptional()
  theme_color?: string;

  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @IsNumber()
  @Min(1)
  @IsOptional()
  max_students?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  max_teachers?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  // School Owner Account Details
  @IsString()
  @IsNotEmpty()
  owner_name!: string;

  @IsString()
  @IsNotEmpty()
  owner_phone!: string;

  @IsEmail()
  @IsNotEmpty()
  owner_email!: string;

  @IsString()
  @IsOptional()
  owner_password?: string;
}

import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SchoolStatus, SubscriptionPlan } from '../entities/school.entity.js';

export class UpdateSchoolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

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

  @IsEnum(SchoolStatus)
  @IsOptional()
  status?: SchoolStatus;

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
}

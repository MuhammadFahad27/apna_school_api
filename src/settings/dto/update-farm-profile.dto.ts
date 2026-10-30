import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateFarmProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultMilkRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rateChangeReason?: string;

  @IsOptional()
  @IsBoolean()
  enableAfternoonShift?: boolean;

  @IsOptional()
  @IsArray()
  shifts?: string[];
}

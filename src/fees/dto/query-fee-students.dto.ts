import { IsOptional, IsString } from 'class-validator';

export class QueryFeeStudentsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  class_id?: string;

  @IsOptional()
  @IsString()
  section_id?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  month?: string; // e.g. November

  @IsOptional()
  year?: number; // e.g. 2026

  @IsOptional()
  @IsString()
  fee_status?: string; // all, paid, unpaid
}

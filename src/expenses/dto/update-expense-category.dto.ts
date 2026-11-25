import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CategoryStatus } from '../entities/expense-category.entity.js';

export class UpdateExpenseCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

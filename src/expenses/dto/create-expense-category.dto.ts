import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryStatus } from '../entities/expense-category.entity.js';

export class CreateExpenseCategoryDto {
  @IsNotEmpty({ message: 'Category name is required.' })
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

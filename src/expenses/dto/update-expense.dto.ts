import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExpensePaymentMethod } from '../entities/expense.entity.js';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Valid category ID is required.' })
  category_id?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number.' })
  @Min(0.01, { message: 'Amount must be greater than zero.' })
  amount?: number;

  @IsOptional()
  @IsString()
  expense_date?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  payment_method?: ExpensePaymentMethod;

  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receipt_url?: string;
}

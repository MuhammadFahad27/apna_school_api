import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExpensePaymentMethod } from '../entities/expense.entity.js';

export class CreateExpenseDto {
  @IsNotEmpty({ message: 'Expense title is required.' })
  @IsString()
  title!: string;

  @IsNotEmpty({ message: 'Category is required.' })
  @IsUUID('all', { message: 'Valid category ID is required.' })
  category_id!: string;

  @IsNotEmpty({ message: 'Amount is required.' })
  @IsNumber({}, { message: 'Amount must be a number.' })
  @Min(0.01, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @IsNotEmpty({ message: 'Expense date is required.' })
  @IsString()
  expense_date!: string; // YYYY-MM-DD

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

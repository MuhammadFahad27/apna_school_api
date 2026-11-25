import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ExpenseCategory } from './expense-category.entity.js';

export enum ExpensePaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHEQUE = 'cheque',
  ONLINE = 'online',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'expense_number' })
  expense_number!: string; // e.g. EXP_0001

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'uuid', name: 'category_id' })
  category_id!: string;

  @ManyToOne('ExpenseCategory', 'expenses', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: ExpenseCategory;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value) || 0,
    },
  })
  amount!: number;

  @Column({ type: 'date', name: 'expense_date' })
  expense_date!: string; // YYYY-MM-DD

  @Column({
    type: 'enum',
    enum: ExpensePaymentMethod,
    default: ExpensePaymentMethod.CASH,
    name: 'payment_method',
  })
  payment_method!: ExpensePaymentMethod;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'vendor_name' })
  vendor_name!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true, name: 'receipt_url' })
  receipt_url!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  created_by!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { PayRun } from './pay-run.entity.js';
import type { Teacher } from '../../teachers/entities/teacher.entity.js';

export enum PayslipStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  VOID = 'void',
}

@Entity('payslips')
@Unique('UQ_payslips_teacher_month_year', ['teacher_id', 'payroll_month', 'payroll_year'])
export class Payslip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true, name: 'payslip_number' })
  payslip_number!: string; // e.g. PSL_0001

  @Column({ type: 'uuid', name: 'pay_run_id' })
  pay_run_id!: string;

  @ManyToOne('PayRun', 'payslips', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pay_run_id' })
  payRun!: PayRun;

  @Column({ type: 'uuid', name: 'teacher_id' })
  teacher_id!: string;

  @ManyToOne('Teacher', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_id' })
  teacher!: Teacher;

  @Column({ type: 'varchar', length: 20, name: 'payroll_month' })
  payroll_month!: string; // e.g. August

  @Column({ type: 'integer', name: 'payroll_year' })
  payroll_year!: number; // e.g. 2026

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'base_salary',
  })
  base_salary!: number; // Snapshot preserved

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'bonus_amount',
  })
  bonus_amount!: number;

  @Column({ type: 'text', nullable: true, name: 'bonus_reason' })
  bonus_reason!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'deduction_amount',
  })
  deduction_amount!: number;

  @Column({ type: 'text', nullable: true, name: 'deduction_reason' })
  deduction_reason!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'net_salary',
  })
  net_salary!: number; // base_salary + bonus_amount - deduction_amount

  @Column({
    type: 'enum',
    enum: PayslipStatus,
    default: PayslipStatus.UNPAID,
    name: 'payment_status',
  })
  payment_status!: PayslipStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'payment_date' })
  payment_date!: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

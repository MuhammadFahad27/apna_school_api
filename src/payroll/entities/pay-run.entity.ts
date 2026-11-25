import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Payslip } from './payslip.entity.js';

@Entity('pay_runs')
export class PayRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true, name: 'pay_run_number' })
  pay_run_number!: string; // e.g. PR_0001

  @Column({ type: 'varchar', length: 20, name: 'payroll_month' })
  payroll_month!: string; // e.g. August

  @Column({ type: 'integer', name: 'payroll_year' })
  payroll_year!: number; // e.g. 2026

  @Column({ type: 'integer', default: 0, name: 'total_teachers' })
  total_teachers!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'total_amount',
  })
  total_amount!: number;

  @Column({ type: 'integer', default: 0, name: 'paid_count' })
  paid_count!: number;

  @Column({ type: 'integer', default: 0, name: 'unpaid_count' })
  unpaid_count!: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'created_by' })
  created_by!: string | null;

  @OneToMany('Payslip', 'payRun')
  payslips!: Payslip[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

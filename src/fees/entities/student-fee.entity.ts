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
import type { Student } from '../../students/entities/student.entity.js';

export enum FeePaymentStatus {
  PAID = 'paid',
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  WAIVED = 'waived',
}

@Entity('student_fees')
@Unique('UQ_student_fee_session_month', ['student_id', 'academic_session', 'month', 'year'])
export class StudentFee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'student_id' })
  student_id!: string;

  @ManyToOne('Student', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @Column({ type: 'varchar', length: 30, name: 'academic_session' })
  academic_session!: string; // e.g. 2026 or 2024-2025

  @Column({ type: 'varchar', length: 20 })
  month!: string; // e.g. January, February, etc.

  @Column({ type: 'integer' })
  year!: number; // e.g. 2026

  @Column({ type: 'integer', name: 'month_index' })
  month_index!: number; // 1 to 12

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'due_amount',
  })
  due_amount!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'paid_amount',
  })
  paid_amount!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discount!: number;

  @Column({
    type: 'enum',
    enum: FeePaymentStatus,
    default: FeePaymentStatus.UNPAID,
  })
  status!: FeePaymentStatus;

  @Column({ type: 'date', nullable: true, name: 'payment_date' })
  payment_date!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  payment_method!: string | null; // cash, bank_transfer, online, easypaisa, jazzcash, cheque

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'receipt_number' })
  receipt_number!: string | null; // e.g. REC_001

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'collected_by' })
  collected_by!: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

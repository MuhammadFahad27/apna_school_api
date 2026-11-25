import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Student } from '../../students/entities/student.entity.js';
import type { Class } from '../../classes/entities/class.entity.js';
import type { Section } from '../../sections/entities/section.entity.js';

@Entity('fee_vouchers')
export class FeeVoucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'voucher_number' })
  voucher_number!: string;

  @Column({ type: 'varchar', length: 20, name: 'billing_month' })
  billing_month!: string;

  @Column({ type: 'integer', name: 'billing_year' })
  billing_year!: number;

  @Column({ type: 'uuid', nullable: true, name: 'school_id' })
  school_id?: string | null;

  @Column({ type: 'uuid', name: 'student_id' })
  student_id!: string;

  @ManyToOne('Student', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @Column({ type: 'uuid', nullable: true, name: 'class_id' })
  class_id?: string | null;

  @ManyToOne('Class', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class?: Class | null;

  @Column({ type: 'uuid', nullable: true, name: 'section_id' })
  section_id?: string | null;

  @ManyToOne('Section', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'section_id' })
  section?: Section | null;

  @Column({ type: 'varchar', length: 20, name: 'issue_date' })
  issue_date!: string;

  @Column({ type: 'varchar', length: 20, name: 'due_date' })
  due_date!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'late_fee' })
  late_fee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'tuition_fee' })
  tuition_fee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'arrears' })
  arrears!: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb", name: 'custom_heads' })
  custom_heads!: Array<{ title: string; amount: number }>;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_within_due' })
  total_within_due!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_after_due' })
  total_after_due!: number;

  @Column({ type: 'jsonb', name: 'student_data' })
  student_data!: {
    id: string;
    student_id: string;
    admission_number: string;
    full_name: string;
    father_name: string;
    class_id: string;
    class_name: string;
    class_code: string;
    section_id?: string | null;
    section_name?: string | null;
    emergency_contact: string;
  };

  @Column({ type: 'jsonb', name: 'bank_info' })
  bank_info!: {
    bank_name: string;
    account_title: string;
    account_no: string;
    branch_note: string;
  };

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updated_at!: Date;
}

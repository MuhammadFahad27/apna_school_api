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
import type { Class } from './class.entity.js';
import type { Section } from '../../sections/entities/section.entity.js';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  PROMOTED = 'promoted',
  TRANSFERRED = 'transferred',
  GRADUATED = 'graduated',
  DROPPED = 'dropped',
}

@Entity('student_enrollments')
@Unique('UQ_student_enrollments_student_session', ['student_id', 'academic_session'])
export class StudentEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'student_id' })
  student_id!: string;

  @ManyToOne('Student', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @Column({ type: 'uuid', name: 'class_id' })
  class_id!: string;

  @ManyToOne('Class', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id' })
  class!: Class;

  @Column({ type: 'uuid', name: 'section_id' })
  section_id!: string;

  @ManyToOne('Section', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'section_id' })
  section!: Section;

  @Column({ type: 'varchar', length: 30, name: 'academic_session' })
  academic_session!: string; // e.g. 2024-2025

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'roll_number' })
  roll_number!: string | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE', name: 'enrollment_date' })
  enrollment_date!: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status!: EnrollmentStatus;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

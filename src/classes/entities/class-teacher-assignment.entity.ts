import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Section } from '../../sections/entities/section.entity.js';
import type { Teacher } from '../../teachers/entities/teacher.entity.js';

@Entity('class_teacher_assignments')
export class ClassTeacherAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'section_id' })
  section_id!: string;

  @ManyToOne('Section', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section!: Section;

  @Column({ type: 'uuid', name: 'teacher_id' })
  teacher_id!: string;

  @ManyToOne('Teacher', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_id' })
  teacher!: Teacher;

  @Column({ type: 'varchar', length: 30, name: 'academic_session' })
  academic_session!: string; // e.g. 2024-2025

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active!: boolean;

  @Column({ type: 'date', default: () => 'CURRENT_DATE', name: 'assigned_date' })
  assigned_date!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

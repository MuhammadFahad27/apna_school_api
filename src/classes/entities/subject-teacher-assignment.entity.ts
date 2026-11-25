import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { SectionSubject } from './section-subject.entity.js';
import type { Teacher } from '../../teachers/entities/teacher.entity.js';

@Entity('subject_teacher_assignments')
export class SubjectTeacherAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'section_subject_id' })
  section_subject_id!: string;

  @ManyToOne('SectionSubject', 'teacherAssignments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_subject_id' })
  sectionSubject!: SectionSubject;

  @Column({ type: 'uuid', name: 'teacher_id' })
  teacher_id!: string;

  @ManyToOne('Teacher', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_id' })
  teacher!: Teacher;

  @Column({ type: 'varchar', length: 30, name: 'academic_session' })
  academic_session!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active!: boolean;

  @Column({ type: 'date', default: () => 'CURRENT_DATE', name: 'assigned_date' })
  assigned_date!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

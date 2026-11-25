import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Section } from '../../sections/entities/section.entity.js';
import type { Subject } from '../../subjects/entities/subject.entity.js';
import type { SubjectTeacherAssignment } from './subject-teacher-assignment.entity.js';

@Entity('section_subjects')
@Unique('UQ_section_subject_session', ['section_id', 'subject_id', 'academic_session'])
export class SectionSubject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'section_id' })
  section_id!: string;

  @ManyToOne('Section', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section!: Section;

  @Column({ type: 'uuid', name: 'subject_id' })
  subject_id!: string;

  @ManyToOne('Subject', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ type: 'varchar', length: 30, name: 'academic_session' })
  academic_session!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @OneToMany('SubjectTeacherAssignment', 'sectionSubject')
  teacherAssignments!: SubjectTeacherAssignment[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

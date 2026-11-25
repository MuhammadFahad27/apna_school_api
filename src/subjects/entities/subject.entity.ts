import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true, name: 'subject_id' })
  subject_id!: string; // Displayed as SUB_001, SUB_002...

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string; // e.g. MATH, ENG, SCI, URDU

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: SubjectStatus,
    default: SubjectStatus.ACTIVE,
  })
  status!: SubjectStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

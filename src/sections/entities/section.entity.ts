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
import type { Class } from '../../classes/entities/class.entity.js';

export enum SectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('sections')
@Unique('UQ_sections_class_id_name', ['class_id', 'name'])
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'class_id' })
  class_id!: string;

  @ManyToOne('Class', 'sections', {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'class_id' })
  class!: Class;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'room_number' })
  room_number!: string | null;

  @Column({ type: 'integer', default: 40 })
  capacity!: number;

  @Column({
    type: 'enum',
    enum: SectionStatus,
    default: SectionStatus.ACTIVE,
  })
  status!: SectionStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

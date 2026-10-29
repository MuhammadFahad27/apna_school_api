import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import type { Farm } from './farm.entity.js';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  farmId!: string;

  @ManyToOne('Farm', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmId' })
  farm!: Relation<Farm>;

  @Column()
  name!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

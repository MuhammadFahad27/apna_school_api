import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import type { Farm } from './farm.entity.js';
import type { User } from '../users/user.entity.js';

export enum EmployeeRole {
  MANAGER = 'manager',
  WORKER = 'worker',
}

export enum DutyShift {
  MORNING = 'morning',
  EVENING = 'evening',
  BOTH = 'both',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  farmId!: string;

  @ManyToOne('Farm', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmId' })
  farm!: Relation<Farm>;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @OneToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User> | null;

  @Column()
  name!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', default: EmployeeRole.WORKER })
  role!: EmployeeRole;

  @Column({ type: 'varchar', default: DutyShift.BOTH })
  dutyShift!: DutyShift;

  @Column({ type: 'date', nullable: true })
  joiningDate!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  baseSalary!: number;

  @Column({ type: 'varchar', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  emergencyContact!: string | null;

  @Column({ type: 'varchar', nullable: true })
  cnic!: string | null;

  @Column({ type: 'text', nullable: true })
  deactivationReason!: string | null;

  @Column({ type: 'boolean', default: true })
  mustChangePassword!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

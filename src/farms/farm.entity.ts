import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import type { Employee } from './employee.entity.js';

export enum FarmStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('farms')
export class Farm {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ unique: true })
  ownerId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Column({ type: 'varchar', default: FarmStatus.ACTIVE })
  status!: FarmStatus;

  @Column({ type: 'text', nullable: true })
  suspensionReason!: string | null;

  @Column({ type: 'int', default: 500 })
  maxCattle!: number;

  @Column({ type: 'int', default: 50 })
  maxStaff!: number;

  @OneToMany('Employee', (employee: Employee) => employee.farm)
  employees!: Relation<Employee>[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

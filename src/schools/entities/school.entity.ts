import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/user.entity.js';

export enum SchoolStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

@Entity('schools')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string; // e.g. "ALH-001", "BHS-002"

  @Column({ type: 'varchar', length: 150, unique: true })
  slug!: string; // e.g. "al-harmain", "beaconhouse"

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

  @Column({ type: 'text', nullable: true })
  logo_url!: string | null;

  @Column({ type: 'varchar', length: 30, default: '#0c3a2b' })
  theme_color!: string;

  @Column({
    type: 'enum',
    enum: SchoolStatus,
    default: SchoolStatus.ACTIVE,
  })
  status!: SchoolStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.STANDARD,
  })
  plan!: SubscriptionPlan;

  @Column({ type: 'int', default: 500 })
  max_students!: number;

  @Column({ type: 'int', default: 50 })
  max_teachers!: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  subscription_end_date!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => User, (user) => user.school)
  users!: User[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}

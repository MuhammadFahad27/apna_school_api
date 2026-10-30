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
import type { Farm } from '../farms/farm.entity.js';
import type { User } from '../users/user.entity.js';

export enum SupportStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum SupportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('support_requests')
export class SupportRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  ticketNumber!: string;

  @Column({ type: 'uuid' })
  farmId!: string;

  @ManyToOne('Farm', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmId' })
  farm!: Relation<Farm>;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: Relation<User>;

  @Column({ type: 'varchar' })
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'enum',
    enum: SupportPriority,
    default: SupportPriority.MEDIUM,
  })
  priority!: SupportPriority;

  @Column({
    type: 'enum',
    enum: SupportStatus,
    default: SupportStatus.OPEN,
  })
  status!: SupportStatus;

  @Column({ type: 'text', nullable: true })
  adminResponse!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedById!: string | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedById' })
  closedBy!: Relation<User> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

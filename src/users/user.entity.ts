import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  FARM_OWNER = 'farm_owner',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email!: string | null;

  @Column()
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'text', nullable: true })
  suspensionReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

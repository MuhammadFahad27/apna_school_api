import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StaffGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum StaffEmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RESIGNED = 'resigned',
  TERMINATED = 'terminated',
}

export enum StaffEmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  DAILY_WAGES = 'daily_wages',
}

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'school_id' })
  school_id?: string | null;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'staff_id' })
  staff_id!: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  full_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'father_or_husband_name' })
  father_or_husband_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'cnic_number' })
  cnic_number!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'phone_number' })
  phone_number!: string;

  @Column({
    type: 'enum',
    enum: StaffGender,
    default: StaffGender.MALE,
  })
  gender!: StaffGender;

  @Column({ type: 'varchar', length: 100, name: 'role_title' })
  role_title!: string;

  @Column({
    type: 'enum',
    enum: StaffEmploymentStatus,
    default: StaffEmploymentStatus.ACTIVE,
    name: 'employment_status',
  })
  employment_status!: StaffEmploymentStatus;

  @Column({
    type: 'enum',
    enum: StaffEmploymentType,
    default: StaffEmploymentType.FULL_TIME,
    name: 'employment_type',
  })
  employment_type!: StaffEmploymentType;

  @Column({ type: 'date', nullable: true, name: 'joining_date' })
  joining_date!: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'base_salary',
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value) || 0,
    },
  })
  base_salary!: number;

  @Column({ type: 'text', nullable: true, name: 'home_address' })
  home_address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'emergency_contact_name' })
  emergency_contact_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'emergency_contact_number' })
  emergency_contact_number!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}

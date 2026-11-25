import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum Designation {
  PRINCIPAL = 'principal',
  VICE_PRINCIPAL = 'vice_principal',
  SENIOR_TEACHER = 'senior_teacher',
  JUNIOR_TEACHER = 'junior_teacher',
  SUBJECT_TEACHER = 'subject_teacher',
  CLASS_TEACHER = 'class_teacher',
  ASSISTANT_TEACHER = 'assistant_teacher',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
}

export enum EmploymentStatus {
  ACTIVE = 'active',
  RESIGNED = 'resigned',
  TERMINATED = 'terminated',
}

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'school_id' })
  school_id?: string | null;

  // A. Personal Information
  @Column({ type: 'varchar', length: 50, unique: true, name: 'employee_id' })
  employee_id!: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  full_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'father_name' })
  father_name!: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
    default: Gender.MALE,
  })
  gender!: Gender;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  date_of_birth!: string | null;

  @Column({ type: 'varchar', length: 30, name: 'phone_number' })
  phone_number!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true, name: 'profile_picture' })
  profile_picture!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'cnic_number' })
  cnic_number!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  // B. Professional Information
  @Column({ type: 'varchar', length: 150 })
  qualification!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  specialization!: string | null;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
    default: 0,
    name: 'experience_years',
  })
  experience_years!: number | null;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'previous_school' })
  previous_school!: string | null;

  @Column({
    type: 'enum',
    enum: Designation,
    default: Designation.SUBJECT_TEACHER,
  })
  designation!: Designation;

  @Column({ type: 'date', name: 'joining_date' })
  joining_date!: string;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
    name: 'employment_type',
  })
  employment_type!: EmploymentType;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 40000,
    name: 'base_salary',
  })
  base_salary!: number;

  // C. Employment Information
  @Column({
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
    name: 'employment_status',
  })
  employment_status!: EmploymentStatus;

  @Column({ type: 'integer', nullable: true, name: 'probation_period' })
  probation_period!: number | null;

  @Column({ type: 'date', nullable: true, name: 'confirmation_date' })
  confirmation_date!: string | null;

  @Column({ type: 'date', nullable: true, name: 'contract_end_date' })
  contract_end_date!: string | null;

  @Column({ type: 'date', nullable: true, name: 'resignation_date' })
  resignation_date!: string | null;

  @Column({ type: 'text', nullable: true, name: 'leaving_reason' })
  leaving_reason!: string | null;

  // D. Additional Information
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'emergency_contact_name' })
  emergency_contact_name!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'emergency_contact_number' })
  emergency_contact_number!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'emergency_contact_relation' })
  emergency_contact_relation!: string | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'", name: 'qualification_documents' })
  qualification_documents!: Array<{ name: string; url: string }> | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'", name: 'experience_certificates' })
  experience_certificates!: Array<{ name: string; url: string }> | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

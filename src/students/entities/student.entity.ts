import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Class } from '../../classes/entities/class.entity.js';
import type { Section } from '../../sections/entities/section.entity.js';

export enum StudentGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRANSFERRED = 'transferred',
  GRADUATED = 'graduated',
  SUSPENDED = 'suspended',
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'school_id' })
  school_id?: string | null;

  // 1. Personal Information
  @Column({ type: 'varchar', length: 30, unique: true, name: 'student_id' })
  student_id!: string; // Displayed as Student ID / Roll No e.g. STD_001

  @Column({ type: 'varchar', length: 50, unique: true, name: 'admission_number' })
  admission_number!: string; // e.g. ADM_001

  @Column({ type: 'varchar', length: 50, name: 'first_name' })
  first_name!: string;

  @Column({ type: 'varchar', length: 50, name: 'last_name' })
  last_name!: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  full_name!: string;

  @Column({ type: 'date', name: 'date_of_birth' })
  date_of_birth!: string;

  @Column({
    type: 'enum',
    enum: StudentGender,
    default: StudentGender.MALE,
  })
  gender!: StudentGender;

  @Column({ type: 'text', nullable: true, name: 'profile_picture' })
  profile_picture!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'blood_group' })
  blood_group!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Pakistani' })
  nationality!: string;

  // 2. Parent / Guardian Information
  @Column({ type: 'varchar', length: 100, name: 'father_name' })
  father_name!: string;

  @Column({ type: 'varchar', length: 30, name: 'father_contact_number' })
  father_contact_number!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'father_occupation' })
  father_occupation!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'mother_name' })
  mother_name!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'mother_contact_number' })
  mother_contact_number!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'guardian_name' })
  guardian_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'guardian_relation' })
  guardian_relation!: string | null;

  @Column({ type: 'varchar', length: 30, name: 'emergency_contact_number' })
  emergency_contact_number!: string;

  // 3. Academic Information
  @Column({ type: 'date', default: () => 'CURRENT_DATE', name: 'admission_date' })
  admission_date!: string;

  @Column({ type: 'varchar', length: 30, name: 'academic_session' })
  academic_session!: string; // e.g. 2024-2025

  @Column({ type: 'uuid', name: 'class_id' })
  class_id!: string;

  @ManyToOne('Class', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id' })
  class!: Class;

  @Column({ type: 'uuid', name: 'section_id', nullable: true })
  section_id!: string | null;

  @ManyToOne('Section', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'section_id' })
  section!: Section | null;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'previous_school' })
  previous_school!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'previous_class' })
  previous_class!: string | null;

  @Column({ type: 'text', nullable: true, name: 'previous_academic_record' })
  previous_academic_record!: string | null;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE,
    name: 'student_status',
  })
  student_status!: StudentStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'monthly_fee',
  })
  monthly_fee!: number;

  // 4. Address Information
  @Column({ type: 'varchar', length: 50, default: 'Pakistan' })
  country!: string;

  @Column({ type: 'varchar', length: 50, default: 'Karachi' })
  city!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area!: string | null;

  @Column({ type: 'text', nullable: true, name: 'complete_address' })
  complete_address!: string | null;

  // 5. Additional Information
  @Column({ type: 'text', nullable: true, name: 'medical_notes' })
  medical_notes!: string | null;

  @Column({ type: 'text', nullable: true })
  allergies!: string | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'", name: 'previous_school_documents' })
  previous_school_documents!: Array<{ name: string; url: string }> | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'birth_certificate_or_bform' })
  birth_certificate_or_bform!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  // 6. System Fields
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'created_by' })
  created_by!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'updated_by' })
  updated_by!: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at!: Date;
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795174331251 implements MigrationInterface {
    name = 'Migration1795174331251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."teachers_gender_enum" AS ENUM('male', 'female', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."teachers_designation_enum" AS ENUM('principal', 'vice_principal', 'senior_teacher', 'junior_teacher', 'subject_teacher', 'class_teacher', 'assistant_teacher')`);
        await queryRunner.query(`CREATE TYPE "public"."teachers_employment_type_enum" AS ENUM('full_time', 'part_time', 'contract')`);
        await queryRunner.query(`CREATE TYPE "public"."teachers_employment_status_enum" AS ENUM('active', 'on_leave', 'resigned', 'terminated')`);
        await queryRunner.query(`CREATE TABLE "teachers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" character varying(50) NOT NULL, "full_name" character varying(100) NOT NULL, "father_name" character varying(100), "gender" "public"."teachers_gender_enum" NOT NULL DEFAULT 'male', "date_of_birth" date, "phone_number" character varying(30) NOT NULL, "email" character varying(150), "profile_picture" text, "cnic_number" character varying(30), "address" text, "qualification" character varying(150) NOT NULL, "specialization" character varying(150), "experience_years" numeric(4,1) DEFAULT '0', "previous_school" character varying(150), "designation" "public"."teachers_designation_enum" NOT NULL DEFAULT 'subject_teacher', "joining_date" date NOT NULL, "employment_type" "public"."teachers_employment_type_enum" NOT NULL DEFAULT 'full_time', "employment_status" "public"."teachers_employment_status_enum" NOT NULL DEFAULT 'active', "probation_period" integer, "confirmation_date" date, "contract_end_date" date, "resignation_date" date, "leaving_reason" text, "emergency_contact_name" character varying(100), "emergency_contact_number" character varying(30), "emergency_contact_relation" character varying(50), "qualification_documents" jsonb DEFAULT '[]', "experience_certificates" jsonb DEFAULT '[]', "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_41a9b4d0b9007c9630463244316" UNIQUE ("employee_id"), CONSTRAINT "PK_a8d4f83be3abe4c687b0a0093c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "teacher_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teacher_id" uuid NOT NULL, "class_id" uuid NOT NULL, "section_id" uuid NOT NULL, "subject" character varying(100) NOT NULL, "is_class_teacher" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_teacher_class_section_subject" UNIQUE ("teacher_id", "class_id", "section_id", "subject"), CONSTRAINT "PK_49fabd5cfe8fa2beb47a0b0fed9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "teacher_assignments" ADD CONSTRAINT "FK_a063342479f3789f5ff6f22aa6b" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teacher_assignments" ADD CONSTRAINT "FK_c1bd828e100d9b3c72402672938" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teacher_assignments" ADD CONSTRAINT "FK_f8d44263ea9667675742a5913bc" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teacher_assignments" DROP CONSTRAINT "FK_f8d44263ea9667675742a5913bc"`);
        await queryRunner.query(`ALTER TABLE "teacher_assignments" DROP CONSTRAINT "FK_c1bd828e100d9b3c72402672938"`);
        await queryRunner.query(`ALTER TABLE "teacher_assignments" DROP CONSTRAINT "FK_a063342479f3789f5ff6f22aa6b"`);
        await queryRunner.query(`DROP TABLE "teacher_assignments"`);
        await queryRunner.query(`DROP TABLE "teachers"`);
        await queryRunner.query(`DROP TYPE "public"."teachers_employment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."teachers_employment_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."teachers_designation_enum"`);
        await queryRunner.query(`DROP TYPE "public"."teachers_gender_enum"`);
    }

}

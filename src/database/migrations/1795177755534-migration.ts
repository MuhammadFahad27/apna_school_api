import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795177755534 implements MigrationInterface {
    name = 'Migration1795177755534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."students_gender_enum" AS ENUM('male', 'female', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."students_student_status_enum" AS ENUM('active', 'inactive', 'transferred', 'graduated', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "students" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_id" character varying(30) NOT NULL, "admission_number" character varying(50) NOT NULL, "first_name" character varying(50) NOT NULL, "last_name" character varying(50) NOT NULL, "full_name" character varying(100) NOT NULL, "date_of_birth" date NOT NULL, "gender" "public"."students_gender_enum" NOT NULL DEFAULT 'male', "profile_picture" text, "blood_group" character varying(10), "nationality" character varying(50) NOT NULL DEFAULT 'Pakistani', "father_name" character varying(100) NOT NULL, "father_contact_number" character varying(30) NOT NULL, "father_occupation" character varying(100), "mother_name" character varying(100), "mother_contact_number" character varying(30), "guardian_name" character varying(100), "guardian_relation" character varying(50), "emergency_contact_number" character varying(30) NOT NULL, "admission_date" date NOT NULL DEFAULT ('now'::text)::date, "academic_session" character varying(30) NOT NULL, "class_id" uuid NOT NULL, "section_id" uuid NOT NULL, "previous_school" character varying(150), "previous_class" character varying(50), "previous_academic_record" text, "student_status" "public"."students_student_status_enum" NOT NULL DEFAULT 'active', "country" character varying(50) NOT NULL DEFAULT 'Pakistan', "city" character varying(50) NOT NULL DEFAULT 'Karachi', "area" character varying(100), "complete_address" text, "medical_notes" text, "allergies" text, "previous_school_documents" jsonb DEFAULT '[]', "birth_certificate_or_bform" character varying(50), "remarks" text, "created_by" character varying(100), "updated_by" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ba36f3e3743f80d1cdc51020103" UNIQUE ("student_id"), CONSTRAINT "UQ_3a5a65fd14ee5058740f7e119e5" UNIQUE ("admission_number"), CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."teachers_employment_status_enum" RENAME TO "teachers_employment_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."teachers_employment_status_enum" AS ENUM('active', 'resigned', 'terminated')`);
        await queryRunner.query(`ALTER TABLE "teachers" ALTER COLUMN "employment_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "teachers" ALTER COLUMN "employment_status" TYPE "public"."teachers_employment_status_enum" USING "employment_status"::"text"::"public"."teachers_employment_status_enum"`);
        await queryRunner.query(`ALTER TABLE "teachers" ALTER COLUMN "employment_status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."teachers_employment_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_de6ad4ae6936dce474e2823984e" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_3e1663d65a2373870a2511d6dc4" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_3e1663d65a2373870a2511d6dc4"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_de6ad4ae6936dce474e2823984e"`);
        await queryRunner.query(`CREATE TYPE "public"."teachers_employment_status_enum_old" AS ENUM('active', 'on_leave', 'resigned', 'terminated')`);
        await queryRunner.query(`ALTER TABLE "teachers" ALTER COLUMN "employment_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "teachers" ALTER COLUMN "employment_status" TYPE "public"."teachers_employment_status_enum_old" USING "employment_status"::"text"::"public"."teachers_employment_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "teachers" ALTER COLUMN "employment_status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."teachers_employment_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."teachers_employment_status_enum_old" RENAME TO "teachers_employment_status_enum"`);
        await queryRunner.query(`DROP TABLE "students"`);
        await queryRunner.query(`DROP TYPE "public"."students_student_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."students_gender_enum"`);
    }

}

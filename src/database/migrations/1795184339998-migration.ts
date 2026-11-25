import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795184339998 implements MigrationInterface {
    name = 'Migration1795184339998'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."staff_gender_enum" AS ENUM('male', 'female', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_employment_status_enum" AS ENUM('active', 'inactive', 'resigned', 'terminated')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_employment_type_enum" AS ENUM('full_time', 'part_time', 'contract', 'daily_wages')`);
        await queryRunner.query(`CREATE TABLE "staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "staff_id" character varying(50) NOT NULL, "full_name" character varying(100) NOT NULL, "father_or_husband_name" character varying(100), "cnic_number" character varying(50), "phone_number" character varying(50) NOT NULL, "gender" "public"."staff_gender_enum" NOT NULL DEFAULT 'male', "role_title" character varying(100) NOT NULL, "employment_status" "public"."staff_employment_status_enum" NOT NULL DEFAULT 'active', "employment_type" "public"."staff_employment_type_enum" NOT NULL DEFAULT 'full_time', "joining_date" date, "base_salary" numeric(10,2) NOT NULL DEFAULT '0', "home_address" text, "emergency_contact_name" character varying(100), "emergency_contact_number" character varying(50), "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ce6869e5d8a52ed3edd5cb750f6" UNIQUE ("staff_id"), CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "staff"`);
        await queryRunner.query(`DROP TYPE "public"."staff_employment_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."staff_employment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."staff_gender_enum"`);
    }

}

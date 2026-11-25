import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795183596222 implements MigrationInterface {
    name = 'Migration1795183596222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pay_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pay_run_number" character varying(30) NOT NULL, "payroll_month" character varying(20) NOT NULL, "payroll_year" integer NOT NULL, "total_teachers" integer NOT NULL DEFAULT '0', "total_amount" numeric(12,2) NOT NULL DEFAULT '0', "paid_count" integer NOT NULL DEFAULT '0', "unpaid_count" integer NOT NULL DEFAULT '0', "created_by" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6dbb0adec6a76511fbf94354316" UNIQUE ("pay_run_number"), CONSTRAINT "PK_bbc20ac26fb7af4af107955b3dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payslips_payment_status_enum" AS ENUM('unpaid', 'paid', 'void')`);
        await queryRunner.query(`CREATE TABLE "payslips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payslip_number" character varying(30) NOT NULL, "pay_run_id" uuid NOT NULL, "teacher_id" uuid NOT NULL, "payroll_month" character varying(20) NOT NULL, "payroll_year" integer NOT NULL, "base_salary" numeric(10,2) NOT NULL DEFAULT '0', "bonus_amount" numeric(10,2) NOT NULL DEFAULT '0', "bonus_reason" text, "deduction_amount" numeric(10,2) NOT NULL DEFAULT '0', "deduction_reason" text, "net_salary" numeric(10,2) NOT NULL DEFAULT '0', "payment_status" "public"."payslips_payment_status_enum" NOT NULL DEFAULT 'unpaid', "payment_date" TIMESTAMP, "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_88d8b8ef3a739d27fc174baa9de" UNIQUE ("payslip_number"), CONSTRAINT "UQ_payslips_teacher_month_year" UNIQUE ("teacher_id", "payroll_month", "payroll_year"), CONSTRAINT "PK_2b1cd07059daf60cc440c9976e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "teachers" ADD "base_salary" numeric(10,2) NOT NULL DEFAULT '40000'`);
        await queryRunner.query(`ALTER TABLE "payslips" ADD CONSTRAINT "FK_ba81be05cfa33a75ce1eb79ca36" FOREIGN KEY ("pay_run_id") REFERENCES "pay_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payslips" ADD CONSTRAINT "FK_9cdf1cf311c0db1c0683017f755" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payslips" DROP CONSTRAINT "FK_9cdf1cf311c0db1c0683017f755"`);
        await queryRunner.query(`ALTER TABLE "payslips" DROP CONSTRAINT "FK_ba81be05cfa33a75ce1eb79ca36"`);
        await queryRunner.query(`ALTER TABLE "teachers" DROP COLUMN "base_salary"`);
        await queryRunner.query(`DROP TABLE "payslips"`);
        await queryRunner.query(`DROP TYPE "public"."payslips_payment_status_enum"`);
        await queryRunner.query(`DROP TABLE "pay_runs"`);
    }

}

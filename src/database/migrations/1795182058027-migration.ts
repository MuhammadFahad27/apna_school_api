import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795182058027 implements MigrationInterface {
    name = 'Migration1795182058027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."student_fees_status_enum" AS ENUM('paid', 'unpaid', 'partial', 'waived')`);
        await queryRunner.query(`CREATE TABLE "student_fees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_id" uuid NOT NULL, "academic_session" character varying(30) NOT NULL, "month" character varying(20) NOT NULL, "year" integer NOT NULL, "month_index" integer NOT NULL, "due_amount" numeric(10,2) NOT NULL DEFAULT '0', "paid_amount" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."student_fees_status_enum" NOT NULL DEFAULT 'unpaid', "payment_date" date, "payment_method" character varying(50), "receipt_number" character varying(50), "remarks" text, "collected_by" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_student_fee_session_month" UNIQUE ("student_id", "academic_session", "month", "year"), CONSTRAINT "PK_a2cec5273eddb36c724e226cf13" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "students" ADD "monthly_fee" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "student_fees" ADD CONSTRAINT "FK_9e8969b8c743de99403b16b592c" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student_fees" DROP CONSTRAINT "FK_9e8969b8c743de99403b16b592c"`);
        await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "monthly_fee"`);
        await queryRunner.query(`DROP TABLE "student_fees"`);
        await queryRunner.query(`DROP TYPE "public"."student_fees_status_enum"`);
    }

}

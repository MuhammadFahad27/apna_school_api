import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1793280709358 implements MigrationInterface {
    name = 'Migration1793280709358'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "suspensionReason" text`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "suspensionReason" text`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "maxCattle" integer NOT NULL DEFAULT '500'`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "maxStaff" integer NOT NULL DEFAULT '50'`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "farmId"`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "farmId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "UQ_cbc362d1c574464a63d3acc3ead" UNIQUE ("phone")`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_d3a30911800c6faf9eaa5de2f2e" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_d3a30911800c6faf9eaa5de2f2e"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "UQ_cbc362d1c574464a63d3acc3ead"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "farmId"`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "farmId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "maxStaff"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "maxCattle"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "suspensionReason"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "suspensionReason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_a000cca60bcf04454e727699490"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "isActive"`);
    }

}

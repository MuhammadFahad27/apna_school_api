import { MigrationInterface, QueryRunner } from "typeorm";

export class EmployeeManagement1793367852099 implements MigrationInterface {
    name = 'EmployeeManagement1793367852099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "UQ_737991e10350d9626f592894cef" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "role" character varying NOT NULL DEFAULT 'worker'`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "dutyShift" character varying NOT NULL DEFAULT 'both'`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "joiningDate" date`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "baseSalary" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "photoUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "emergencyContact" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "cnic" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "deactivationReason" text`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "mustChangePassword" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "lastLoginAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastLoginAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'manager'`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'worker'`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_737991e10350d9626f592894cef" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_737991e10350d9626f592894cef"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('admin', 'farm_owner')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLoginAt"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "lastLoginAt"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "mustChangePassword"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "deactivationReason"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "cnic"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "emergencyContact"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "photoUrl"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "baseSalary"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "joiningDate"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "dutyShift"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "UQ_737991e10350d9626f592894cef"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "userId"`);
    }

}

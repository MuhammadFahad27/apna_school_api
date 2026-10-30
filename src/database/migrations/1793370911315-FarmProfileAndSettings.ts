import { MigrationInterface, QueryRunner } from "typeorm";

export class FarmProfileAndSettings1793370911315 implements MigrationInterface {
    name = 'FarmProfileAndSettings1793370911315'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "farms" ADD "address" character varying`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "city" character varying`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "contactPhone" character varying`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "logoUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "defaultMilkRate" numeric(10,2) NOT NULL DEFAULT '180'`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "milkRateHistory" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "enableAfternoonShift" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "farms" ADD "shifts" jsonb NOT NULL DEFAULT '["morning", "evening"]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "shifts"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "enableAfternoonShift"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "milkRateHistory"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "defaultMilkRate"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "logoUrl"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "contactPhone"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN "address"`);
    }

}

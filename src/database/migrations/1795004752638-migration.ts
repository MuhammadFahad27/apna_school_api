import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795004752638 implements MigrationInterface {
    name = 'Migration1795004752638'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."classes_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "code" character varying(20) NOT NULL, "description" text, "display_order" integer NOT NULL DEFAULT '0', "status" "public"."classes_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."sections_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "class_id" uuid NOT NULL, "name" character varying(50) NOT NULL, "room_number" character varying(50), "capacity" integer NOT NULL DEFAULT '40', "status" "public"."sections_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_sections_class_id_name" UNIQUE ("class_id", "name"), CONSTRAINT "PK_f9749dd3bffd880a497d007e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_27db91d7369af6f181412afa99f" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_27db91d7369af6f181412afa99f"`);
        await queryRunner.query(`DROP TABLE "sections"`);
        await queryRunner.query(`DROP TYPE "public"."sections_status_enum"`);
        await queryRunner.query(`DROP TABLE "classes"`);
        await queryRunner.query(`DROP TYPE "public"."classes_status_enum"`);
    }

}

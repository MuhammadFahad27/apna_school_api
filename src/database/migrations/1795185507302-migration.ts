import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795185507302 implements MigrationInterface {
    name = 'Migration1795185507302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."expenses_payment_method_enum" AS ENUM('cash', 'bank_transfer', 'cheque', 'online', 'other')`);
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "expense_number" character varying(50) NOT NULL, "title" character varying(200) NOT NULL, "category_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "expense_date" date NOT NULL, "payment_method" "public"."expenses_payment_method_enum" NOT NULL DEFAULT 'cash', "vendor_name" character varying(150), "description" text, "receipt_url" text, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c104942da407cb31c7e6b5b40ac" UNIQUE ("expense_number"), CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."expense_categories_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "expense_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "status" "public"."expense_categories_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6bdb3db95dd955d3c701e935426" UNIQUE ("name"), CONSTRAINT "PK_d0ef31e189d9523461215b62775" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_5d1f4be708e0dfe2afa1a3c376c" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_5d1f4be708e0dfe2afa1a3c376c"`);
        await queryRunner.query(`DROP TABLE "expense_categories"`);
        await queryRunner.query(`DROP TYPE "public"."expense_categories_status_enum"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TYPE "public"."expenses_payment_method_enum"`);
    }

}

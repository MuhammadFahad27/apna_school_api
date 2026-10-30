import { MigrationInterface, QueryRunner } from "typeorm";

export class SupportRequestsAndAudit1793369189264 implements MigrationInterface {
    name = 'SupportRequestsAndAudit1793369189264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."support_requests_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TYPE "public"."support_requests_status_enum" AS ENUM('open', 'closed')`);
        await queryRunner.query(`CREATE TABLE "support_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketNumber" character varying NOT NULL, "farmId" uuid NOT NULL, "ownerId" uuid NOT NULL, "subject" character varying NOT NULL, "message" text NOT NULL, "priority" "public"."support_requests_priority_enum" NOT NULL DEFAULT 'medium', "status" "public"."support_requests_status_enum" NOT NULL DEFAULT 'open', "adminResponse" text, "respondedAt" TIMESTAMP, "closedAt" TIMESTAMP, "closedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_468040fc06b1a563b0873da125c" UNIQUE ("ticketNumber"), CONSTRAINT "PK_a9ce3cdbad0970597a07ab5db97" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "support_requests" ADD CONSTRAINT "FK_bc553b9b110ded3755c46513ec0" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_requests" ADD CONSTRAINT "FK_0b59958f499319cba0f10ce6832" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_requests" ADD CONSTRAINT "FK_a3c0dfb1185c145857c2fc463fa" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_requests" DROP CONSTRAINT "FK_a3c0dfb1185c145857c2fc463fa"`);
        await queryRunner.query(`ALTER TABLE "support_requests" DROP CONSTRAINT "FK_0b59958f499319cba0f10ce6832"`);
        await queryRunner.query(`ALTER TABLE "support_requests" DROP CONSTRAINT "FK_bc553b9b110ded3755c46513ec0"`);
        await queryRunner.query(`DROP TABLE "support_requests"`);
        await queryRunner.query(`DROP TYPE "public"."support_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."support_requests_priority_enum"`);
    }

}

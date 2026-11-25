import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1795181030188 implements MigrationInterface {
    name = 'Migration1795181030188'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subjects_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subject_id" character varying(30) NOT NULL, "name" character varying(100) NOT NULL, "code" character varying(30) NOT NULL, "description" text, "status" "public"."subjects_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3573ed298f466a8ba663579e077" UNIQUE ("subject_id"), CONSTRAINT "UQ_542cbba74dde3c82ab49c573109" UNIQUE ("code"), CONSTRAINT "PK_1a023685ac2b051b4e557b0b280" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."student_enrollments_status_enum" AS ENUM('active', 'promoted', 'transferred', 'graduated', 'dropped')`);
        await queryRunner.query(`CREATE TABLE "student_enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_id" uuid NOT NULL, "class_id" uuid NOT NULL, "section_id" uuid NOT NULL, "academic_session" character varying(30) NOT NULL, "roll_number" character varying(30), "enrollment_date" date NOT NULL DEFAULT ('now'::text)::date, "status" "public"."student_enrollments_status_enum" NOT NULL DEFAULT 'active', "remarks" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_student_enrollments_student_session" UNIQUE ("student_id", "academic_session"), CONSTRAINT "PK_65f64fb270d4575b099b16e00a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "class_teacher_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "teacher_id" uuid NOT NULL, "academic_session" character varying(30) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "assigned_date" date NOT NULL DEFAULT ('now'::text)::date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a22876304f47e21e52c252ec2ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "section_subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "subject_id" uuid NOT NULL, "academic_session" character varying(30) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_section_subject_session" UNIQUE ("section_id", "subject_id", "academic_session"), CONSTRAINT "PK_6e1c0ed0c14c903d16bfdbabbe9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subject_teacher_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_subject_id" uuid NOT NULL, "teacher_id" uuid NOT NULL, "academic_session" character varying(30) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "assigned_date" date NOT NULL DEFAULT ('now'::text)::date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_51e26d39ed0bed115b1ad3f07f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_08caafd8a026a19ecf54db0e958" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_e875df488b1b297f25e3dff3039" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_a504e03e002336b6bf7f17d6212" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "FK_f5aacd499f6b9b6266854e4760b" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "FK_c027d1449b3a253507237b6bc0c" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "section_subjects" ADD CONSTRAINT "FK_e67a352bd6dbd5286fd7f0bdaf7" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "section_subjects" ADD CONSTRAINT "FK_922acf6ed65fbfba498fe82262d" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "FK_947ce21100b7ae02de2361083c4" FOREIGN KEY ("section_subject_id") REFERENCES "section_subjects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subject_teacher_assignments" ADD CONSTRAINT "FK_7b719424af3bf2e0a3959734b85" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subject_teacher_assignments" DROP CONSTRAINT "FK_7b719424af3bf2e0a3959734b85"`);
        await queryRunner.query(`ALTER TABLE "subject_teacher_assignments" DROP CONSTRAINT "FK_947ce21100b7ae02de2361083c4"`);
        await queryRunner.query(`ALTER TABLE "section_subjects" DROP CONSTRAINT "FK_922acf6ed65fbfba498fe82262d"`);
        await queryRunner.query(`ALTER TABLE "section_subjects" DROP CONSTRAINT "FK_e67a352bd6dbd5286fd7f0bdaf7"`);
        await queryRunner.query(`ALTER TABLE "class_teacher_assignments" DROP CONSTRAINT "FK_c027d1449b3a253507237b6bc0c"`);
        await queryRunner.query(`ALTER TABLE "class_teacher_assignments" DROP CONSTRAINT "FK_f5aacd499f6b9b6266854e4760b"`);
        await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_a504e03e002336b6bf7f17d6212"`);
        await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_e875df488b1b297f25e3dff3039"`);
        await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_08caafd8a026a19ecf54db0e958"`);
        await queryRunner.query(`DROP TABLE "subject_teacher_assignments"`);
        await queryRunner.query(`DROP TABLE "section_subjects"`);
        await queryRunner.query(`DROP TABLE "class_teacher_assignments"`);
        await queryRunner.query(`DROP TABLE "student_enrollments"`);
        await queryRunner.query(`DROP TYPE "public"."student_enrollments_status_enum"`);
        await queryRunner.query(`DROP TABLE "subjects"`);
        await queryRunner.query(`DROP TYPE "public"."subjects_status_enum"`);
    }

}

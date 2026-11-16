import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_prospects_report_reach" AS ENUM('hallazgos', 'comparacion', 'propuesta', 'final');
  CREATE TYPE "public"."enum_prospects_report_click" AS ENUM('whatsapp', 'agenda', 'propuesta', 'diagnostico');
  ALTER TABLE "prospects" ADD COLUMN "report_reach" "enum_prospects_report_reach";
  ALTER TABLE "prospects" ADD COLUMN "report_click" "enum_prospects_report_click";
  ALTER TABLE "prospects" ADD COLUMN "report_clicked_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "prospects" DROP COLUMN "report_reach";
  ALTER TABLE "prospects" DROP COLUMN "report_click";
  ALTER TABLE "prospects" DROP COLUMN "report_clicked_at";
  DROP TYPE "public"."enum_prospects_report_reach";
  DROP TYPE "public"."enum_prospects_report_click";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "offer_profiles" ADD COLUMN "benefits" varchar;
  ALTER TABLE "offer_profiles" ADD COLUMN "proof_result" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "offer_profiles" DROP COLUMN "benefits";
  ALTER TABLE "offer_profiles" DROP COLUMN "proof_result";`)
}

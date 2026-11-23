import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" ADD COLUMN "instagram_login_url" varchar;
  ALTER TABLE "instagram_accounts" DROP COLUMN "token_refreshed_at";
  ALTER TABLE "settings" DROP COLUMN "instagram_app_id";
  ALTER TABLE "settings" DROP COLUMN "instagram_app_secret";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "instagram_accounts" ADD COLUMN "token_refreshed_at" timestamp(3) with time zone;
  ALTER TABLE "settings" ADD COLUMN "instagram_app_id" varchar;
  ALTER TABLE "settings" ADD COLUMN "instagram_app_secret" varchar;
  ALTER TABLE "settings" DROP COLUMN "instagram_login_url";`)
}

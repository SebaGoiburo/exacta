import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" ADD COLUMN "instagram_account_ids" varchar;`)
  // @exacta_agencia, as Business Settings shows it: Meta's sign-in doesn't always say which account it shared.
  await db.execute(sql`UPDATE "settings" SET "instagram_account_ids" = '17841453196890350';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" DROP COLUMN "instagram_account_ids";`)
}

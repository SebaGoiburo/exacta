import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" ADD COLUMN "pay_transfer_discount" numeric DEFAULT 10;
  ALTER TABLE "settings" ADD COLUMN "pay_six_surcharge" numeric DEFAULT 13;
  ALTER TABLE "settings" ADD COLUMN "mp_fee_charge" numeric DEFAULT 1.53;
  ALTER TABLE "settings" ADD COLUMN "mp_fee_three" numeric DEFAULT 10.49;
  ALTER TABLE "settings" ADD COLUMN "mp_fee_six" numeric DEFAULT 18.69;
  ALTER TABLE "settings" ADD COLUMN "mp_vat" numeric DEFAULT 21;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" DROP COLUMN "pay_transfer_discount";
  ALTER TABLE "settings" DROP COLUMN "pay_six_surcharge";
  ALTER TABLE "settings" DROP COLUMN "mp_fee_charge";
  ALTER TABLE "settings" DROP COLUMN "mp_fee_three";
  ALTER TABLE "settings" DROP COLUMN "mp_fee_six";
  ALTER TABLE "settings" DROP COLUMN "mp_vat";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_conversation_messages_kind" ADD VALUE 'otro';
  ALTER TABLE "conversation_messages" ADD COLUMN "meta_type" varchar;
  ALTER TABLE "conversation_messages" ADD COLUMN "meta_detail" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "conversation_messages" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "conversation_messages" ALTER COLUMN "kind" SET DEFAULT 'texto'::text;
  DROP TYPE "public"."enum_conversation_messages_kind";
  CREATE TYPE "public"."enum_conversation_messages_kind" AS ENUM('texto', 'audio', 'archivo', 'plantilla');
  ALTER TABLE "conversation_messages" ALTER COLUMN "kind" SET DEFAULT 'texto'::"public"."enum_conversation_messages_kind";
  ALTER TABLE "conversation_messages" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_conversation_messages_kind" USING "kind"::"public"."enum_conversation_messages_kind";
  ALTER TABLE "conversation_messages" DROP COLUMN "meta_type";
  ALTER TABLE "conversation_messages" DROP COLUMN "meta_detail";`)
}

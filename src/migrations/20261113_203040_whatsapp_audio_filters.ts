import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_conversations_discard_reason" AS ENUM('proveedor', 'empleo', 'spam', 'rafaga', 'manual');
  CREATE TYPE "public"."enum_conversation_messages_kind" AS ENUM('texto', 'audio', 'archivo', 'plantilla');
  ALTER TYPE "public"."enum_conversations_status" ADD VALUE 'descartada';
  CREATE TABLE "voice_notes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wa_message_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "conversations" ADD COLUMN "discard_reason" "enum_conversations_discard_reason";
  ALTER TABLE "conversations" ADD COLUMN "discarded_at" timestamp(3) with time zone;
  ALTER TABLE "conversations" ADD COLUMN "notified_at" timestamp(3) with time zone;
  ALTER TABLE "conversation_messages" ADD COLUMN "kind" "enum_conversation_messages_kind" DEFAULT 'texto';
  ALTER TABLE "conversation_messages" ADD COLUMN "audio_id" integer;
  ALTER TABLE "conversation_messages" ADD COLUMN "transcribed" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "voice_notes_id" integer;
  CREATE INDEX "voice_notes_wa_message_id_idx" ON "voice_notes" USING btree ("wa_message_id");
  CREATE INDEX "voice_notes_updated_at_idx" ON "voice_notes" USING btree ("updated_at");
  CREATE INDEX "voice_notes_created_at_idx" ON "voice_notes" USING btree ("created_at");
  CREATE UNIQUE INDEX "voice_notes_filename_idx" ON "voice_notes" USING btree ("filename");
  ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_audio_id_voice_notes_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."voice_notes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_voice_notes_fk" FOREIGN KEY ("voice_notes_id") REFERENCES "public"."voice_notes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "conversation_messages_audio_idx" ON "conversation_messages" USING btree ("audio_id");
  CREATE INDEX "payload_locked_documents_rels_voice_notes_id_idx" ON "payload_locked_documents_rels" USING btree ("voice_notes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "voice_notes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "voice_notes" CASCADE;
  ALTER TABLE "conversation_messages" DROP CONSTRAINT "conversation_messages_audio_id_voice_notes_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_voice_notes_fk";
  
  ALTER TABLE "conversations" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "conversations" ALTER COLUMN "status" SET DEFAULT 'agente'::text;
  DROP TYPE "public"."enum_conversations_status";
  CREATE TYPE "public"."enum_conversations_status" AS ENUM('agente', 'derivada', 'humano');
  ALTER TABLE "conversations" ALTER COLUMN "status" SET DEFAULT 'agente'::"public"."enum_conversations_status";
  ALTER TABLE "conversations" ALTER COLUMN "status" SET DATA TYPE "public"."enum_conversations_status" USING "status"::"public"."enum_conversations_status";
  DROP INDEX "conversation_messages_audio_idx";
  DROP INDEX "payload_locked_documents_rels_voice_notes_id_idx";
  ALTER TABLE "conversations" DROP COLUMN "discard_reason";
  ALTER TABLE "conversations" DROP COLUMN "discarded_at";
  ALTER TABLE "conversations" DROP COLUMN "notified_at";
  ALTER TABLE "conversation_messages" DROP COLUMN "kind";
  ALTER TABLE "conversation_messages" DROP COLUMN "audio_id";
  ALTER TABLE "conversation_messages" DROP COLUMN "transcribed";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "voice_notes_id";
  DROP TYPE "public"."enum_conversations_discard_reason";
  DROP TYPE "public"."enum_conversation_messages_kind";`)
}

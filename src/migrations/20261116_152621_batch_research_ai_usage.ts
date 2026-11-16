import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ai_usage_feature" AS ENUM('prospectos', 'whatsapp', 'contenido');
  CREATE TABLE "ai_usage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"feature" "enum_ai_usage_feature" NOT NULL,
  	"model" varchar,
  	"input_tokens" numeric,
  	"output_tokens" numeric,
  	"cache_write_tokens" numeric,
  	"cache_read_tokens" numeric,
  	"searches" numeric,
  	"batch" boolean,
  	"cost_usd" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "prospect_jobs" ADD COLUMN "via_batch" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ai_usage_id" integer;
  CREATE INDEX "ai_usage_feature_idx" ON "ai_usage" USING btree ("feature");
  CREATE INDEX "ai_usage_updated_at_idx" ON "ai_usage" USING btree ("updated_at");
  CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ai_usage_fk" FOREIGN KEY ("ai_usage_id") REFERENCES "public"."ai_usage"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ai_usage_id_idx" ON "payload_locked_documents_rels" USING btree ("ai_usage_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ai_usage" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ai_usage" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ai_usage_fk";
  
  DROP INDEX "payload_locked_documents_rels_ai_usage_id_idx";
  ALTER TABLE "prospect_jobs" DROP COLUMN "via_batch";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ai_usage_id";
  DROP TYPE "public"."enum_ai_usage_feature";`)
}

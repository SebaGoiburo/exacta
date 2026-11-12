import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_prospects_attempts_channel" AS ENUM('llamada', 'whatsapp', 'email', 'instagram', 'visita');
  CREATE TYPE "public"."enum_prospects_attempts_result" AS ENUM('enviado', 'no_atendio', 'hablo', 'rechazo');
  CREATE TYPE "public"."enum_prospects_tier" AS ENUM('A', 'B', 'C');
  CREATE TYPE "public"."enum_prospects_outcome" AS ENUM('reunion', 'ganado', 'perdido', 'sin_respuesta', 'rechazo');
  CREATE TYPE "public"."enum_offer_profiles_signals_area" AS ENUM('processes', 'systems', 'data', 'customers', 'ai');
  CREATE TYPE "public"."enum_offer_profiles_status" AS ENUM('borrador', 'aprobado');
  CREATE TYPE "public"."enum_offer_profiles_origin" AS ENUM('inicial', 'texto_libre');
  CREATE TYPE "public"."enum_prospect_batches_status" AS ENUM('buscando', 'puntuada', 'investigando', 'lista', 'fallo');
  CREATE TYPE "public"."enum_prospect_jobs_kind" AS ENUM('research', 'profile');
  CREATE TYPE "public"."enum_prospect_jobs_status" AS ENUM('queued', 'running', 'done', 'failed');
  ALTER TYPE "public"."enum_prospects_status" ADD VALUE 'elegido' BEFORE 'contactado';
  ALTER TYPE "public"."enum_prospects_status" ADD VALUE 'informe' BEFORE 'contactado';
  CREATE TABLE "prospects_attempts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"channel" "enum_prospects_attempts_channel" NOT NULL,
  	"result" "enum_prospects_attempts_result" NOT NULL,
  	"note" varchar,
  	"by_id" integer
  );
  
  CREATE TABLE "offer_profiles_signals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"weight" numeric NOT NULL,
  	"area" "enum_offer_profiles_signals_area" NOT NULL
  );
  
  CREATE TABLE "offer_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"status" "enum_offer_profiles_status" DEFAULT 'borrador' NOT NULL,
  	"origin" "enum_offer_profiles_origin" DEFAULT 'inicial',
  	"parent_id" integer,
  	"weights_capacity" numeric NOT NULL,
  	"weights_need" numeric NOT NULL,
  	"weights_gap" numeric NOT NULL,
  	"weights_demand" numeric NOT NULL,
  	"weights_access" numeric NOT NULL,
  	"weights_timing" numeric NOT NULL,
  	"min_capacity" numeric DEFAULT 30 NOT NULL,
  	"proof" varchar,
  	"cost_formula" varchar,
  	"approved_by_id" integer,
  	"approved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "prospect_batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"profile_id" integer NOT NULL,
  	"niche" varchar NOT NULL,
  	"zone" varchar NOT NULL,
  	"status" "enum_prospect_batches_status" DEFAULT 'buscando' NOT NULL,
  	"progress" varchar,
  	"found" numeric DEFAULT 0,
  	"knocked_out" numeric DEFAULT 0,
  	"kept" numeric DEFAULT 0,
  	"places_calls" numeric DEFAULT 0,
  	"ai_cost_usd" numeric DEFAULT 0,
  	"error" varchar,
  	"started_by_id" integer,
  	"finished_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "prospect_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_prospect_jobs_kind" NOT NULL,
  	"status" "enum_prospect_jobs_status" DEFAULT 'queued' NOT NULL,
  	"prospect_id" integer,
  	"batch_id" integer,
  	"offer_text" varchar,
  	"request" jsonb,
  	"sources_seen" jsonb,
  	"continuations" numeric DEFAULT 0,
  	"started_at" timestamp(3) with time zone,
  	"cost_usd" numeric DEFAULT 0,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "contacts" ADD COLUMN "place_id" varchar;
  ALTER TABLE "leads" ADD COLUMN "next_step" varchar;
  ALTER TABLE "leads" ADD COLUMN "next_step_at" timestamp(3) with time zone;
  ALTER TABLE "leads" ADD COLUMN "referred_by_id" integer;
  ALTER TABLE "prospects" ADD COLUMN "diagnostic_id" integer;
  ALTER TABLE "prospects" ADD COLUMN "batch_id" integer;
  ALTER TABLE "prospects" ADD COLUMN "profile_id" integer;
  ALTER TABLE "prospects" ADD COLUMN "score" numeric;
  ALTER TABLE "prospects" ADD COLUMN "tier" "enum_prospects_tier";
  ALTER TABLE "prospects" ADD COLUMN "pass" numeric;
  ALTER TABLE "prospects" ADD COLUMN "missing" numeric;
  ALTER TABLE "prospects" ADD COLUMN "shortlisted" boolean;
  ALTER TABLE "prospects" ADD COLUMN "scores" jsonb;
  ALTER TABLE "prospects" ADD COLUMN "knockouts" jsonb;
  ALTER TABLE "prospects" ADD COLUMN "facts" jsonb;
  ALTER TABLE "prospects" ADD COLUMN "research" jsonb;
  ALTER TABLE "prospects" ADD COLUMN "hook" varchar;
  ALTER TABLE "prospects" ADD COLUMN "report" jsonb;
  ALTER TABLE "prospects" ADD COLUMN "report_token" varchar;
  ALTER TABLE "prospects" ADD COLUMN "report_reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "report_expires_at" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "report_sent_at" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "report_opened_at" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "report_last_opened_at" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "report_opens" numeric DEFAULT 0;
  ALTER TABLE "prospects" ADD COLUMN "next_attempt_at" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "blocked_until" timestamp(3) with time zone;
  ALTER TABLE "prospects" ADD COLUMN "outcome" "enum_prospects_outcome";
  ALTER TABLE "prospects" ADD COLUMN "outcome_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "offer_profiles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "prospect_batches_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "prospect_jobs_id" integer;
  ALTER TABLE "prospects_attempts" ADD CONSTRAINT "prospects_attempts_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospects_attempts" ADD CONSTRAINT "prospects_attempts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offer_profiles_signals" ADD CONSTRAINT "offer_profiles_signals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offer_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offer_profiles" ADD CONSTRAINT "offer_profiles_parent_id_offer_profiles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."offer_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offer_profiles" ADD CONSTRAINT "offer_profiles_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospect_batches" ADD CONSTRAINT "prospect_batches_profile_id_offer_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."offer_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospect_batches" ADD CONSTRAINT "prospect_batches_started_by_id_users_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospect_jobs" ADD CONSTRAINT "prospect_jobs_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospect_jobs" ADD CONSTRAINT "prospect_jobs_batch_id_prospect_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."prospect_batches"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "prospects_attempts_order_idx" ON "prospects_attempts" USING btree ("_order");
  CREATE INDEX "prospects_attempts_parent_id_idx" ON "prospects_attempts" USING btree ("_parent_id");
  CREATE INDEX "prospects_attempts_by_idx" ON "prospects_attempts" USING btree ("by_id");
  CREATE INDEX "offer_profiles_signals_order_idx" ON "offer_profiles_signals" USING btree ("_order");
  CREATE INDEX "offer_profiles_signals_parent_id_idx" ON "offer_profiles_signals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "offer_profiles_key_idx" ON "offer_profiles" USING btree ("key");
  CREATE INDEX "offer_profiles_parent_idx" ON "offer_profiles" USING btree ("parent_id");
  CREATE INDEX "offer_profiles_approved_by_idx" ON "offer_profiles" USING btree ("approved_by_id");
  CREATE INDEX "offer_profiles_updated_at_idx" ON "offer_profiles" USING btree ("updated_at");
  CREATE INDEX "offer_profiles_created_at_idx" ON "offer_profiles" USING btree ("created_at");
  CREATE INDEX "prospect_batches_profile_idx" ON "prospect_batches" USING btree ("profile_id");
  CREATE INDEX "prospect_batches_status_idx" ON "prospect_batches" USING btree ("status");
  CREATE INDEX "prospect_batches_started_by_idx" ON "prospect_batches" USING btree ("started_by_id");
  CREATE INDEX "prospect_batches_updated_at_idx" ON "prospect_batches" USING btree ("updated_at");
  CREATE INDEX "prospect_batches_created_at_idx" ON "prospect_batches" USING btree ("created_at");
  CREATE INDEX "prospect_jobs_status_idx" ON "prospect_jobs" USING btree ("status");
  CREATE INDEX "prospect_jobs_prospect_idx" ON "prospect_jobs" USING btree ("prospect_id");
  CREATE INDEX "prospect_jobs_batch_idx" ON "prospect_jobs" USING btree ("batch_id");
  CREATE INDEX "prospect_jobs_updated_at_idx" ON "prospect_jobs" USING btree ("updated_at");
  CREATE INDEX "prospect_jobs_created_at_idx" ON "prospect_jobs" USING btree ("created_at");
  ALTER TABLE "leads" ADD CONSTRAINT "leads_referred_by_id_contacts_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospects" ADD CONSTRAINT "prospects_diagnostic_id_diagnostics_id_fk" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."diagnostics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospects" ADD CONSTRAINT "prospects_batch_id_prospect_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."prospect_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospects" ADD CONSTRAINT "prospects_profile_id_offer_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."offer_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_offer_profiles_fk" FOREIGN KEY ("offer_profiles_id") REFERENCES "public"."offer_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prospect_batches_fk" FOREIGN KEY ("prospect_batches_id") REFERENCES "public"."prospect_batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prospect_jobs_fk" FOREIGN KEY ("prospect_jobs_id") REFERENCES "public"."prospect_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contacts_place_id_idx" ON "contacts" USING btree ("place_id");
  CREATE INDEX "leads_next_step_at_idx" ON "leads" USING btree ("next_step_at");
  CREATE INDEX "leads_referred_by_idx" ON "leads" USING btree ("referred_by_id");
  CREATE INDEX "prospects_status_idx" ON "prospects" USING btree ("status");
  CREATE INDEX "prospects_diagnostic_idx" ON "prospects" USING btree ("diagnostic_id");
  CREATE INDEX "prospects_batch_idx" ON "prospects" USING btree ("batch_id");
  CREATE INDEX "prospects_profile_idx" ON "prospects" USING btree ("profile_id");
  CREATE INDEX "prospects_score_idx" ON "prospects" USING btree ("score");
  CREATE INDEX "prospects_shortlisted_idx" ON "prospects" USING btree ("shortlisted");
  CREATE UNIQUE INDEX "prospects_report_token_idx" ON "prospects" USING btree ("report_token");
  CREATE INDEX "prospects_report_last_opened_at_idx" ON "prospects" USING btree ("report_last_opened_at");
  CREATE INDEX "prospects_next_attempt_at_idx" ON "prospects" USING btree ("next_attempt_at");
  CREATE INDEX "prospects_blocked_until_idx" ON "prospects" USING btree ("blocked_until");
  CREATE INDEX "payload_locked_documents_rels_offer_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("offer_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_prospect_batches_id_idx" ON "payload_locked_documents_rels" USING btree ("prospect_batches_id");
  CREATE INDEX "payload_locked_documents_rels_prospect_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("prospect_jobs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "prospects_attempts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "offer_profiles_signals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "offer_profiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prospect_batches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prospect_jobs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "prospects_attempts" CASCADE;
  DROP TABLE "offer_profiles_signals" CASCADE;
  DROP TABLE "offer_profiles" CASCADE;
  DROP TABLE "prospect_batches" CASCADE;
  DROP TABLE "prospect_jobs" CASCADE;
  ALTER TABLE "leads" DROP CONSTRAINT "leads_referred_by_id_contacts_id_fk";
  
  ALTER TABLE "prospects" DROP CONSTRAINT "prospects_diagnostic_id_diagnostics_id_fk";
  
  ALTER TABLE "prospects" DROP CONSTRAINT "prospects_batch_id_prospect_batches_id_fk";
  
  ALTER TABLE "prospects" DROP CONSTRAINT "prospects_profile_id_offer_profiles_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_offer_profiles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_prospect_batches_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_prospect_jobs_fk";
  
  ALTER TABLE "prospects" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "prospects" ALTER COLUMN "status" SET DEFAULT 'pendiente'::text;
  DROP TYPE "public"."enum_prospects_status";
  CREATE TYPE "public"."enum_prospects_status" AS ENUM('pendiente', 'contactado', 'interesado', 'descartado');
  ALTER TABLE "prospects" ALTER COLUMN "status" SET DEFAULT 'pendiente'::"public"."enum_prospects_status";
  ALTER TABLE "prospects" ALTER COLUMN "status" SET DATA TYPE "public"."enum_prospects_status" USING "status"::"public"."enum_prospects_status";
  DROP INDEX "contacts_place_id_idx";
  DROP INDEX "leads_next_step_at_idx";
  DROP INDEX "leads_referred_by_idx";
  DROP INDEX "prospects_status_idx";
  DROP INDEX "prospects_diagnostic_idx";
  DROP INDEX "prospects_batch_idx";
  DROP INDEX "prospects_profile_idx";
  DROP INDEX "prospects_score_idx";
  DROP INDEX "prospects_shortlisted_idx";
  DROP INDEX "prospects_report_token_idx";
  DROP INDEX "prospects_report_last_opened_at_idx";
  DROP INDEX "prospects_next_attempt_at_idx";
  DROP INDEX "prospects_blocked_until_idx";
  DROP INDEX "payload_locked_documents_rels_offer_profiles_id_idx";
  DROP INDEX "payload_locked_documents_rels_prospect_batches_id_idx";
  DROP INDEX "payload_locked_documents_rels_prospect_jobs_id_idx";
  ALTER TABLE "contacts" DROP COLUMN "place_id";
  ALTER TABLE "leads" DROP COLUMN "next_step";
  ALTER TABLE "leads" DROP COLUMN "next_step_at";
  ALTER TABLE "leads" DROP COLUMN "referred_by_id";
  ALTER TABLE "prospects" DROP COLUMN "diagnostic_id";
  ALTER TABLE "prospects" DROP COLUMN "batch_id";
  ALTER TABLE "prospects" DROP COLUMN "profile_id";
  ALTER TABLE "prospects" DROP COLUMN "score";
  ALTER TABLE "prospects" DROP COLUMN "tier";
  ALTER TABLE "prospects" DROP COLUMN "pass";
  ALTER TABLE "prospects" DROP COLUMN "missing";
  ALTER TABLE "prospects" DROP COLUMN "shortlisted";
  ALTER TABLE "prospects" DROP COLUMN "scores";
  ALTER TABLE "prospects" DROP COLUMN "knockouts";
  ALTER TABLE "prospects" DROP COLUMN "facts";
  ALTER TABLE "prospects" DROP COLUMN "research";
  ALTER TABLE "prospects" DROP COLUMN "hook";
  ALTER TABLE "prospects" DROP COLUMN "report";
  ALTER TABLE "prospects" DROP COLUMN "report_token";
  ALTER TABLE "prospects" DROP COLUMN "report_reviewed_at";
  ALTER TABLE "prospects" DROP COLUMN "report_expires_at";
  ALTER TABLE "prospects" DROP COLUMN "report_sent_at";
  ALTER TABLE "prospects" DROP COLUMN "report_opened_at";
  ALTER TABLE "prospects" DROP COLUMN "report_last_opened_at";
  ALTER TABLE "prospects" DROP COLUMN "report_opens";
  ALTER TABLE "prospects" DROP COLUMN "next_attempt_at";
  ALTER TABLE "prospects" DROP COLUMN "blocked_until";
  ALTER TABLE "prospects" DROP COLUMN "outcome";
  ALTER TABLE "prospects" DROP COLUMN "outcome_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "offer_profiles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "prospect_batches_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "prospect_jobs_id";
  DROP TYPE "public"."enum_prospects_attempts_channel";
  DROP TYPE "public"."enum_prospects_attempts_result";
  DROP TYPE "public"."enum_prospects_tier";
  DROP TYPE "public"."enum_prospects_outcome";
  DROP TYPE "public"."enum_offer_profiles_signals_area";
  DROP TYPE "public"."enum_offer_profiles_status";
  DROP TYPE "public"."enum_offer_profiles_origin";
  DROP TYPE "public"."enum_prospect_batches_status";
  DROP TYPE "public"."enum_prospect_jobs_kind";
  DROP TYPE "public"."enum_prospect_jobs_status";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leads_tier" AS ENUM('A', 'B', 'C');
  CREATE TYPE "public"."enum_diagnostics_tier" AS ENUM('A', 'B', 'C');
  CREATE TYPE "public"."enum_diagnostics_locale" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_prospects_status" AS ENUM('pendiente', 'contactado', 'interesado', 'descartado');
  ALTER TYPE "public"."enum_contacts_source" ADD VALUE 'diagnostico' BEFORE 'whatsapp';
  ALTER TYPE "public"."enum_contacts_source" ADD VALUE 'prospeccion' BEFORE 'whatsapp';
  ALTER TYPE "public"."enum_leads_source" ADD VALUE 'diagnostico' BEFORE 'whatsapp';
  ALTER TYPE "public"."enum_leads_source" ADD VALUE 'prospeccion' BEFORE 'whatsapp';
  CREATE TABLE "diagnostics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token" varchar NOT NULL,
  	"contact_id" integer NOT NULL,
  	"lead_id" integer,
  	"tier" "enum_diagnostics_tier" NOT NULL,
  	"fit" numeric NOT NULL,
  	"maturity" numeric NOT NULL,
  	"locale" "enum_diagnostics_locale" DEFAULT 'es',
  	"areas" jsonb NOT NULL,
  	"answers" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "prospects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"place_id" varchar NOT NULL,
  	"niche" varchar,
  	"zone" varchar,
  	"status" "enum_prospects_status" DEFAULT 'pendiente' NOT NULL,
  	"notes" varchar,
  	"lead_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_url" varchar,
  	"lead_notify_email" varchar,
  	"meta_pixel_id" varchar,
  	"ga4_id" varchar,
  	"google_ads_id" varchar,
  	"google_ads_lead_label" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "contacts" ADD COLUMN "website" varchar;
  ALTER TABLE "leads" ADD COLUMN "tier" "enum_leads_tier";
  ALTER TABLE "leads" ADD COLUMN "fit" numeric;
  ALTER TABLE "leads" ADD COLUMN "maturity" numeric;
  ALTER TABLE "leads" ADD COLUMN "attribution" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "diagnostics_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "prospects_id" integer;
  ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "prospects" ADD CONSTRAINT "prospects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "diagnostics_token_idx" ON "diagnostics" USING btree ("token");
  CREATE INDEX "diagnostics_contact_idx" ON "diagnostics" USING btree ("contact_id");
  CREATE INDEX "diagnostics_lead_idx" ON "diagnostics" USING btree ("lead_id");
  CREATE INDEX "diagnostics_updated_at_idx" ON "diagnostics" USING btree ("updated_at");
  CREATE INDEX "diagnostics_created_at_idx" ON "diagnostics" USING btree ("created_at");
  CREATE UNIQUE INDEX "prospects_place_id_idx" ON "prospects" USING btree ("place_id");
  CREATE INDEX "prospects_lead_idx" ON "prospects" USING btree ("lead_id");
  CREATE INDEX "prospects_updated_at_idx" ON "prospects" USING btree ("updated_at");
  CREATE INDEX "prospects_created_at_idx" ON "prospects" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_diagnostics_fk" FOREIGN KEY ("diagnostics_id") REFERENCES "public"."diagnostics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prospects_fk" FOREIGN KEY ("prospects_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_diagnostics_id_idx" ON "payload_locked_documents_rels" USING btree ("diagnostics_id");
  CREATE INDEX "payload_locked_documents_rels_prospects_id_idx" ON "payload_locked_documents_rels" USING btree ("prospects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "diagnostics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "prospects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "diagnostics" CASCADE;
  DROP TABLE "prospects" CASCADE;
  DROP TABLE "settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_diagnostics_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_prospects_fk";
  
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_contacts_source";
  CREATE TYPE "public"."enum_contacts_source" AS ENUM('web-contacto', 'whatsapp', 'referido', 'manual', 'n8n');
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_contacts_source";
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DATA TYPE "public"."enum_contacts_source" USING "source"::"public"."enum_contacts_source";
  ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_leads_source";
  CREATE TYPE "public"."enum_leads_source" AS ENUM('web-contacto', 'whatsapp', 'referido', 'manual', 'n8n');
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_leads_source";
  ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE "public"."enum_leads_source" USING "source"::"public"."enum_leads_source";
  DROP INDEX "payload_locked_documents_rels_diagnostics_id_idx";
  DROP INDEX "payload_locked_documents_rels_prospects_id_idx";
  ALTER TABLE "contacts" DROP COLUMN "website";
  ALTER TABLE "leads" DROP COLUMN "tier";
  ALTER TABLE "leads" DROP COLUMN "fit";
  ALTER TABLE "leads" DROP COLUMN "maturity";
  ALTER TABLE "leads" DROP COLUMN "attribution";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "diagnostics_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "prospects_id";
  DROP TYPE "public"."enum_leads_tier";
  DROP TYPE "public"."enum_diagnostics_tier";
  DROP TYPE "public"."enum_diagnostics_locale";
  DROP TYPE "public"."enum_prospects_status";`)
}

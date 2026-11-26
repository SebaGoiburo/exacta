import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_masterclasses_status" AS ENUM('borrador', 'abierta', 'cerrada');
  CREATE TYPE "public"."enum_enrollments_status" AS ENUM('pendiente', 'pagada', 'rechazada', 'devuelta', 'cancelada');
  CREATE TYPE "public"."enum_enrollments_tier" AS ENUM('lanzamiento', 'general');
  ALTER TYPE "public"."enum_contacts_source" ADD VALUE 'ia-para-humanos' BEFORE 'referido';
  ALTER TYPE "public"."enum_leads_source" ADD VALUE 'ia-para-humanos' BEFORE 'referido';
  CREATE TABLE "masterclasses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "enum_masterclasses_status" DEFAULT 'borrador' NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"duration_min" numeric DEFAULT 150,
  	"capacity" numeric DEFAULT 30 NOT NULL,
  	"released_seats" numeric DEFAULT 0,
  	"launch_seats" numeric DEFAULT 10,
  	"launch_price" numeric DEFAULT 35000,
  	"price" numeric DEFAULT 45000 NOT NULL,
  	"meet_url" varchar,
  	"recording_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "enrollments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"status" "enum_enrollments_status" DEFAULT 'pendiente' NOT NULL,
  	"amount" numeric,
  	"tier" "enum_enrollments_tier",
  	"seat" numeric,
  	"masterclass_id" integer NOT NULL,
  	"lead_id" integer,
  	"paid_at" timestamp(3) with time zone,
  	"hold_until" timestamp(3) with time zone,
  	"mp_payment_id" varchar,
  	"mp_status" varchar,
  	"mp_preference_id" varchar,
  	"confirmed_at" timestamp(3) with time zone,
  	"reminded24_at" timestamp(3) with time zone,
  	"reminded1_at" timestamp(3) with time zone,
  	"attribution" jsonb,
  	"token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "masterclasses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "enrollments_id" integer;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_masterclass_id_masterclasses_id_fk" FOREIGN KEY ("masterclass_id") REFERENCES "public"."masterclasses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "masterclasses_updated_at_idx" ON "masterclasses" USING btree ("updated_at");
  CREATE INDEX "masterclasses_created_at_idx" ON "masterclasses" USING btree ("created_at");
  CREATE INDEX "enrollments_email_idx" ON "enrollments" USING btree ("email");
  CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");
  CREATE INDEX "enrollments_masterclass_idx" ON "enrollments" USING btree ("masterclass_id");
  CREATE INDEX "enrollments_lead_idx" ON "enrollments" USING btree ("lead_id");
  CREATE UNIQUE INDEX "enrollments_token_idx" ON "enrollments" USING btree ("token");
  CREATE INDEX "enrollments_updated_at_idx" ON "enrollments" USING btree ("updated_at");
  CREATE INDEX "enrollments_created_at_idx" ON "enrollments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_masterclasses_fk" FOREIGN KEY ("masterclasses_id") REFERENCES "public"."masterclasses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enrollments_fk" FOREIGN KEY ("enrollments_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_masterclasses_id_idx" ON "payload_locked_documents_rels" USING btree ("masterclasses_id");
  CREATE INDEX "payload_locked_documents_rels_enrollments_id_idx" ON "payload_locked_documents_rels" USING btree ("enrollments_id");`)

  // The first masterclass: Wednesday 9 December 2026 at 19:00 in Argentina (22:00 UTC).
  await db.execute(sql`
    INSERT INTO "masterclasses" ("title", "status", "starts_at", "duration_min", "capacity", "released_seats", "launch_seats", "launch_price", "price")
    VALUES ('Masterclass IA para Humanos', 'abierta', '2026-12-09T22:00:00.000Z', 150, 30, 0, 10, 35000, 45000);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "masterclasses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "enrollments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "masterclasses" CASCADE;
  DROP TABLE "enrollments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_masterclasses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_enrollments_fk";
  
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_contacts_source";
  CREATE TYPE "public"."enum_contacts_source" AS ENUM('web-contacto', 'diagnostico', 'prospeccion', 'whatsapp', 'instagram', 'referido', 'manual', 'n8n');
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_contacts_source";
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DATA TYPE "public"."enum_contacts_source" USING "source"::"public"."enum_contacts_source";
  ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_leads_source";
  CREATE TYPE "public"."enum_leads_source" AS ENUM('web-contacto', 'diagnostico', 'prospeccion', 'whatsapp', 'instagram', 'referido', 'manual', 'n8n');
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_leads_source";
  ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE "public"."enum_leads_source" USING "source"::"public"."enum_leads_source";
  DROP INDEX "payload_locked_documents_rels_masterclasses_id_idx";
  DROP INDEX "payload_locked_documents_rels_enrollments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "masterclasses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "enrollments_id";
  DROP TYPE "public"."enum_masterclasses_status";
  DROP TYPE "public"."enum_enrollments_status";
  DROP TYPE "public"."enum_enrollments_tier";`)
}

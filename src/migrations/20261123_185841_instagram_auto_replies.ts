import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_instagram_replies_kind" AS ENUM('comentario', 'mensaje', 'respuesta');
  CREATE TYPE "public"."enum_instagram_replies_status" AS ENUM('procesando', 'enviado', 'fallo', 'avisado');
  ALTER TYPE "public"."enum_contacts_source" ADD VALUE 'instagram' BEFORE 'referido';
  ALTER TYPE "public"."enum_leads_activity_type" ADD VALUE 'instagram' BEFORE 'email';
  ALTER TYPE "public"."enum_leads_source" ADD VALUE 'instagram' BEFORE 'referido';
  CREATE TABLE "instagram_keywords" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"message" varchar NOT NULL,
  	"link" varchar,
  	"public_reply" varchar DEFAULT '¡Te lo mandé por mensaje privado! 📩',
  	"interest" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "instagram_keywords_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"instagram_accounts_id" integer
  );
  
  CREATE TABLE "instagram_replies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_key" varchar NOT NULL,
  	"username" varchar,
  	"kind" "enum_instagram_replies_kind",
  	"status" "enum_instagram_replies_status" DEFAULT 'procesando',
  	"text" varchar,
  	"keyword_id" integer,
  	"account_id" integer,
  	"lead_id" integer,
  	"permalink" varchar,
  	"error" varchar,
  	"ig_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "instagram_accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"username" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"ig_id" varchar NOT NULL,
  	"token_expires_at" timestamp(3) with time zone,
  	"token_refreshed_at" timestamp(3) with time zone,
  	"token" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "contacts" ADD COLUMN "instagram" varchar;
  ALTER TABLE "contacts" ADD COLUMN "instagram_id" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_keywords_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_replies_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_accounts_id" integer;
  ALTER TABLE "settings" ADD COLUMN "instagram_app_id" varchar;
  ALTER TABLE "settings" ADD COLUMN "instagram_app_secret" varchar;
  ALTER TABLE "instagram_keywords_rels" ADD CONSTRAINT "instagram_keywords_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."instagram_keywords"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "instagram_keywords_rels" ADD CONSTRAINT "instagram_keywords_rels_instagram_accounts_fk" FOREIGN KEY ("instagram_accounts_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "instagram_replies" ADD CONSTRAINT "instagram_replies_keyword_id_instagram_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."instagram_keywords"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "instagram_replies" ADD CONSTRAINT "instagram_replies_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "instagram_replies" ADD CONSTRAINT "instagram_replies_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "instagram_keywords_keyword_idx" ON "instagram_keywords" USING btree ("keyword");
  CREATE INDEX "instagram_keywords_updated_at_idx" ON "instagram_keywords" USING btree ("updated_at");
  CREATE INDEX "instagram_keywords_created_at_idx" ON "instagram_keywords" USING btree ("created_at");
  CREATE INDEX "instagram_keywords_rels_order_idx" ON "instagram_keywords_rels" USING btree ("order");
  CREATE INDEX "instagram_keywords_rels_parent_idx" ON "instagram_keywords_rels" USING btree ("parent_id");
  CREATE INDEX "instagram_keywords_rels_path_idx" ON "instagram_keywords_rels" USING btree ("path");
  CREATE INDEX "instagram_keywords_rels_instagram_accounts_id_idx" ON "instagram_keywords_rels" USING btree ("instagram_accounts_id");
  CREATE UNIQUE INDEX "instagram_replies_event_key_idx" ON "instagram_replies" USING btree ("event_key");
  CREATE INDEX "instagram_replies_keyword_idx" ON "instagram_replies" USING btree ("keyword_id");
  CREATE INDEX "instagram_replies_account_idx" ON "instagram_replies" USING btree ("account_id");
  CREATE INDEX "instagram_replies_lead_idx" ON "instagram_replies" USING btree ("lead_id");
  CREATE INDEX "instagram_replies_ig_user_id_idx" ON "instagram_replies" USING btree ("ig_user_id");
  CREATE INDEX "instagram_replies_updated_at_idx" ON "instagram_replies" USING btree ("updated_at");
  CREATE INDEX "instagram_replies_created_at_idx" ON "instagram_replies" USING btree ("created_at");
  CREATE UNIQUE INDEX "instagram_accounts_ig_id_idx" ON "instagram_accounts" USING btree ("ig_id");
  CREATE INDEX "instagram_accounts_updated_at_idx" ON "instagram_accounts" USING btree ("updated_at");
  CREATE INDEX "instagram_accounts_created_at_idx" ON "instagram_accounts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_keywords_fk" FOREIGN KEY ("instagram_keywords_id") REFERENCES "public"."instagram_keywords"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_replies_fk" FOREIGN KEY ("instagram_replies_id") REFERENCES "public"."instagram_replies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_accounts_fk" FOREIGN KEY ("instagram_accounts_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contacts_instagram_id_idx" ON "contacts" USING btree ("instagram_id");
  CREATE INDEX "payload_locked_documents_rels_instagram_keywords_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_keywords_id");
  CREATE INDEX "payload_locked_documents_rels_instagram_replies_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_replies_id");
  CREATE INDEX "payload_locked_documents_rels_instagram_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_accounts_id");`)

  // The three keywords of the first reels, as a starting point. The team edits them from the panel.
  const diagnostic = 'https://exactatransformaciondigital.com/diagnostico'
  const keywords = [
    {
      keyword: 'TURNOS',
      interest: 'Turnos online',
      link: null,
      publicReply: '¡Te escribí por mensaje privado! 📩',
      message:
        '¡Hola! Soy Sebastián, de Exacta 👋 Gracias por comentar.\n\nPara armarte el informe gratis necesito dos datos: cómo se llama tu consultorio o negocio y en qué ciudad está. Respondeme por acá y en 48 horas te lo mando, con cómo te encuentran tus pacientes en Google comparado con los primeros de tu zona.',
    },
    {
      keyword: 'AUTOMATIZAR',
      interest: 'Automatización a medida',
      link: diagnostic,
      publicReply: '¡Te lo mandé por mensaje privado! 📩',
      message:
        '¡Hola! Soy Sebastián, de Exacta 👋\n\nEn este diagnóstico de 3 minutos me contás cómo trabaja tu empresa y te digo qué tarea se puede hacer sola. Después lo vemos juntos en una llamada de 20 minutos, sin costo:',
    },
    {
      keyword: 'IA',
      interest: 'IA aplicada',
      link: diagnostic,
      publicReply: '¡Te lo mandé por mensaje privado! 📩',
      message:
        '¡Hola! Soy Sebastián, de Exacta 👋\n\nAcá tenés el diagnóstico gratuito: 13 preguntas, 3 minutos. Te muestra dónde la IA le puede ahorrar horas o plata a tu empresa, y cómo medirlo:',
    },
  ]
  for (const k of keywords) {
    await db.execute(sql`
      INSERT INTO "instagram_keywords" ("keyword", "active", "message", "link", "public_reply", "interest")
      VALUES (${k.keyword}, true, ${k.message}, ${k.link}, ${k.publicReply}, ${k.interest})
      ON CONFLICT ("keyword") DO NOTHING;`)
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "instagram_keywords" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_keywords_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_replies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_accounts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "instagram_keywords" CASCADE;
  DROP TABLE "instagram_keywords_rels" CASCADE;
  DROP TABLE "instagram_replies" CASCADE;
  DROP TABLE "instagram_accounts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_keywords_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_replies_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_accounts_fk";
  
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_contacts_source";
  CREATE TYPE "public"."enum_contacts_source" AS ENUM('web-contacto', 'diagnostico', 'prospeccion', 'whatsapp', 'referido', 'manual', 'n8n');
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_contacts_source";
  ALTER TABLE "contacts" ALTER COLUMN "source" SET DATA TYPE "public"."enum_contacts_source" USING "source"::"public"."enum_contacts_source";
  ALTER TABLE "leads_activity" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "leads_activity" ALTER COLUMN "type" SET DEFAULT 'nota'::text;
  DROP TYPE "public"."enum_leads_activity_type";
  CREATE TYPE "public"."enum_leads_activity_type" AS ENUM('nota', 'llamada', 'whatsapp', 'email', 'reunion');
  ALTER TABLE "leads_activity" ALTER COLUMN "type" SET DEFAULT 'nota'::"public"."enum_leads_activity_type";
  ALTER TABLE "leads_activity" ALTER COLUMN "type" SET DATA TYPE "public"."enum_leads_activity_type" USING "type"::"public"."enum_leads_activity_type";
  ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_leads_source";
  CREATE TYPE "public"."enum_leads_source" AS ENUM('web-contacto', 'diagnostico', 'prospeccion', 'whatsapp', 'referido', 'manual', 'n8n');
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_leads_source";
  ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE "public"."enum_leads_source" USING "source"::"public"."enum_leads_source";
  DROP INDEX "contacts_instagram_id_idx";
  DROP INDEX "payload_locked_documents_rels_instagram_keywords_id_idx";
  DROP INDEX "payload_locked_documents_rels_instagram_replies_id_idx";
  DROP INDEX "payload_locked_documents_rels_instagram_accounts_id_idx";
  ALTER TABLE "contacts" DROP COLUMN "instagram";
  ALTER TABLE "contacts" DROP COLUMN "instagram_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_keywords_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_replies_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_accounts_id";
  ALTER TABLE "settings" DROP COLUMN "instagram_app_id";
  ALTER TABLE "settings" DROP COLUMN "instagram_app_secret";
  DROP TYPE "public"."enum_instagram_replies_kind";
  DROP TYPE "public"."enum_instagram_replies_status";`)
}

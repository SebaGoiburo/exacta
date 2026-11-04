import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_topics_origin" AS ENUM('motor', 'idea');
  CREATE TYPE "public"."enum_content_topics_verdict" AS ENUM('ratificada', 'rectificada');
  CREATE TYPE "public"."enum_content_topics_status" AS ENUM('propuesto', 'generando', 'generado', 'descartado');
  CREATE TYPE "public"."enum_content_pieces_kind" AS ENUM('blog', 'video', 'short', 'linkedin_article', 'linkedin_post');
  CREATE TYPE "public"."enum_content_jobs_kind" AS ENUM('topics', 'idea', 'blog', 'social');
  CREATE TYPE "public"."enum_content_jobs_status" AS ENUM('running', 'done', 'failed');
  CREATE TYPE "public"."enum_subscribers_status" AS ENUM('pendiente', 'confirmado', 'baja');
  ALTER TYPE "public"."enum_posts_origin" ADD VALUE 'motor' BEFORE 'sample';
  ALTER TYPE "public"."enum__posts_v_version_origin" ADD VALUE 'motor' BEFORE 'sample';
  CREATE TABLE "management_tasks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"origin" "enum_content_topics_origin" DEFAULT 'motor' NOT NULL,
  	"idea" varchar,
  	"verdict" "enum_content_topics_verdict",
  	"status" "enum_content_topics_status" DEFAULT 'propuesto' NOT NULL,
  	"score" numeric,
  	"service" varchar,
  	"analysis" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_pieces" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"topic_id" integer NOT NULL,
  	"kind" "enum_content_pieces_kind" NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"post_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_content_jobs_kind" NOT NULL,
  	"status" "enum_content_jobs_status" DEFAULT 'running' NOT NULL,
  	"topic_id" integer,
  	"idea" varchar,
  	"data_used" jsonb,
  	"request" jsonb,
  	"sources_seen" jsonb,
  	"continuations" numeric DEFAULT 0,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_subscribers_status" DEFAULT 'pendiente' NOT NULL,
  	"locale" varchar DEFAULT 'es',
  	"page" varchar,
  	"confirmed_at" timestamp(3) with time zone,
  	"token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "posts" ADD COLUMN "send_to_subscribers" boolean DEFAULT true;
  ALTER TABLE "posts" ADD COLUMN "newsletter_sent_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_send_to_subscribers" boolean DEFAULT true;
  ALTER TABLE "_posts_v" ADD COLUMN "version_newsletter_sent_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "management_tasks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_topics_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_pieces_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_jobs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscribers_id" integer;
  ALTER TABLE "settings" ADD COLUMN "content_themes" varchar DEFAULT 'Transformación digital, desarrollo de software e IA aplicada a empresas.';
  ALTER TABLE "settings" ADD COLUMN "content_priorities" varchar DEFAULT '1. Software a medida
  2. Automatización e IA
  3. Sistema de reserva de turnos y notificaciones automáticas
  4. Agentes de IA';
  ALTER TABLE "settings" ADD COLUMN "content_reader" varchar DEFAULT 'Mandos medios y gerentes de empresas hispanohablantes de Latinoamérica.';
  ALTER TABLE "settings" ADD COLUMN "gsc_site_url" varchar;
  ALTER TABLE "settings" ADD COLUMN "ga4_property_id" varchar;
  ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_topic_id_content_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."content_topics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_topic_id_content_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."content_topics"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "management_tasks_updated_at_idx" ON "management_tasks" USING btree ("updated_at");
  CREATE INDEX "management_tasks_created_at_idx" ON "management_tasks" USING btree ("created_at");
  CREATE INDEX "content_topics_status_idx" ON "content_topics" USING btree ("status");
  CREATE INDEX "content_topics_score_idx" ON "content_topics" USING btree ("score");
  CREATE INDEX "content_topics_updated_at_idx" ON "content_topics" USING btree ("updated_at");
  CREATE INDEX "content_topics_created_at_idx" ON "content_topics" USING btree ("created_at");
  CREATE INDEX "content_pieces_topic_idx" ON "content_pieces" USING btree ("topic_id");
  CREATE INDEX "content_pieces_post_idx" ON "content_pieces" USING btree ("post_id");
  CREATE INDEX "content_pieces_updated_at_idx" ON "content_pieces" USING btree ("updated_at");
  CREATE INDEX "content_pieces_created_at_idx" ON "content_pieces" USING btree ("created_at");
  CREATE INDEX "content_jobs_status_idx" ON "content_jobs" USING btree ("status");
  CREATE INDEX "content_jobs_topic_idx" ON "content_jobs" USING btree ("topic_id");
  CREATE INDEX "content_jobs_updated_at_idx" ON "content_jobs" USING btree ("updated_at");
  CREATE INDEX "content_jobs_created_at_idx" ON "content_jobs" USING btree ("created_at");
  CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");
  CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");
  CREATE UNIQUE INDEX "subscribers_token_idx" ON "subscribers" USING btree ("token");
  CREATE INDEX "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");
  CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_management_tasks_fk" FOREIGN KEY ("management_tasks_id") REFERENCES "public"."management_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_topics_fk" FOREIGN KEY ("content_topics_id") REFERENCES "public"."content_topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_pieces_fk" FOREIGN KEY ("content_pieces_id") REFERENCES "public"."content_pieces"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_jobs_fk" FOREIGN KEY ("content_jobs_id") REFERENCES "public"."content_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk" FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_management_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("management_tasks_id");
  CREATE INDEX "payload_locked_documents_rels_content_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("content_topics_id");
  CREATE INDEX "payload_locked_documents_rels_content_pieces_id_idx" ON "payload_locked_documents_rels" USING btree ("content_pieces_id");
  CREATE INDEX "payload_locked_documents_rels_content_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("content_jobs_id");
  CREATE INDEX "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");`)

  // The first reminder for management, asked for when this area was created.
  await db.execute(sql`
    INSERT INTO "management_tasks" ("title", "description")
    VALUES (
      'Revisar las landings y detectar nuevas landings de nicho',
      'Revisar las páginas por solución e industria ya publicadas, y detectar qué nuevas landings de nicho conviene desarrollar.'
    );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "management_tasks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_topics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_pieces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "subscribers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "management_tasks" CASCADE;
  DROP TABLE "content_topics" CASCADE;
  DROP TABLE "content_pieces" CASCADE;
  DROP TABLE "content_jobs" CASCADE;
  DROP TABLE "subscribers" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_management_tasks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_topics_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_pieces_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_jobs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subscribers_fk";
  
  ALTER TABLE "posts" ALTER COLUMN "origin" SET DATA TYPE text;
  ALTER TABLE "posts" ALTER COLUMN "origin" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_posts_origin";
  CREATE TYPE "public"."enum_posts_origin" AS ENUM('manual', 'n8n', 'sample');
  ALTER TABLE "posts" ALTER COLUMN "origin" SET DEFAULT 'manual'::"public"."enum_posts_origin";
  ALTER TABLE "posts" ALTER COLUMN "origin" SET DATA TYPE "public"."enum_posts_origin" USING "origin"::"public"."enum_posts_origin";
  ALTER TABLE "_posts_v" ALTER COLUMN "version_origin" SET DATA TYPE text;
  ALTER TABLE "_posts_v" ALTER COLUMN "version_origin" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum__posts_v_version_origin";
  CREATE TYPE "public"."enum__posts_v_version_origin" AS ENUM('manual', 'n8n', 'sample');
  ALTER TABLE "_posts_v" ALTER COLUMN "version_origin" SET DEFAULT 'manual'::"public"."enum__posts_v_version_origin";
  ALTER TABLE "_posts_v" ALTER COLUMN "version_origin" SET DATA TYPE "public"."enum__posts_v_version_origin" USING "version_origin"::"public"."enum__posts_v_version_origin";
  DROP INDEX "payload_locked_documents_rels_management_tasks_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_topics_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_pieces_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_jobs_id_idx";
  DROP INDEX "payload_locked_documents_rels_subscribers_id_idx";
  ALTER TABLE "posts" DROP COLUMN "send_to_subscribers";
  ALTER TABLE "posts" DROP COLUMN "newsletter_sent_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_send_to_subscribers";
  ALTER TABLE "_posts_v" DROP COLUMN "version_newsletter_sent_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "management_tasks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_topics_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_pieces_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_jobs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subscribers_id";
  ALTER TABLE "settings" DROP COLUMN "content_themes";
  ALTER TABLE "settings" DROP COLUMN "content_priorities";
  ALTER TABLE "settings" DROP COLUMN "content_reader";
  ALTER TABLE "settings" DROP COLUMN "gsc_site_url";
  ALTER TABLE "settings" DROP COLUMN "ga4_property_id";
  DROP TYPE "public"."enum_content_topics_origin";
  DROP TYPE "public"."enum_content_topics_verdict";
  DROP TYPE "public"."enum_content_topics_status";
  DROP TYPE "public"."enum_content_pieces_kind";
  DROP TYPE "public"."enum_content_jobs_kind";
  DROP TYPE "public"."enum_content_jobs_status";
  DROP TYPE "public"."enum_subscribers_status";`)
}

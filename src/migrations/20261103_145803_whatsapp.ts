import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_conversations_status" AS ENUM('agente', 'derivada', 'humano');
  CREATE TYPE "public"."enum_conversation_messages_sender" AS ENUM('cliente', 'agente', 'asesor', 'sistema');
  CREATE TABLE "conversations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wa_id" varchar NOT NULL,
  	"phone_number_id" varchar,
  	"profile_name" varchar,
  	"status" "enum_conversations_status" DEFAULT 'agente' NOT NULL,
  	"assigned_to_id" integer,
  	"contact_id" integer,
  	"lead_id" integer,
  	"collected_name" varchar,
  	"collected_email" varchar,
  	"collected_company" varchar,
  	"collected_role" varchar,
  	"collected_company_size" varchar,
  	"collected_need" varchar,
  	"last_message_at" timestamp(3) with time zone,
  	"last_inbound_at" timestamp(3) with time zone,
  	"last_preview" varchar,
  	"unread" numeric DEFAULT 0,
  	"ai_replies" numeric DEFAULT 0,
  	"session_start" timestamp(3) with time zone,
  	"handoff_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "conversation_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"conversation_id" integer NOT NULL,
  	"sender" "enum_conversation_messages_sender" NOT NULL,
  	"text" varchar NOT NULL,
  	"wa_message_id" varchar,
  	"failed" boolean DEFAULT false,
  	"author_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "knowledge" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "contacts" ADD COLUMN "role" varchar;
  ALTER TABLE "contacts" ADD COLUMN "company_size" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "conversations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "conversation_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "knowledge_id" integer;
  ALTER TABLE "settings" ADD COLUMN "handoff_phone" varchar;
  ALTER TABLE "settings" ADD COLUMN "handoff_template" varchar DEFAULT 'aviso_derivacion';
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "conversations_wa_id_idx" ON "conversations" USING btree ("wa_id");
  CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");
  CREATE INDEX "conversations_assigned_to_idx" ON "conversations" USING btree ("assigned_to_id");
  CREATE INDEX "conversations_contact_idx" ON "conversations" USING btree ("contact_id");
  CREATE INDEX "conversations_lead_idx" ON "conversations" USING btree ("lead_id");
  CREATE INDEX "conversations_last_message_at_idx" ON "conversations" USING btree ("last_message_at");
  CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");
  CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");
  CREATE INDEX "conversation_messages_conversation_idx" ON "conversation_messages" USING btree ("conversation_id");
  CREATE UNIQUE INDEX "conversation_messages_wa_message_id_idx" ON "conversation_messages" USING btree ("wa_message_id");
  CREATE INDEX "conversation_messages_author_idx" ON "conversation_messages" USING btree ("author_id");
  CREATE INDEX "conversation_messages_updated_at_idx" ON "conversation_messages" USING btree ("updated_at");
  CREATE INDEX "conversation_messages_created_at_idx" ON "conversation_messages" USING btree ("created_at");
  CREATE INDEX "knowledge_updated_at_idx" ON "knowledge" USING btree ("updated_at");
  CREATE INDEX "knowledge_created_at_idx" ON "knowledge" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conversations_fk" FOREIGN KEY ("conversations_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conversation_messages_fk" FOREIGN KEY ("conversation_messages_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_knowledge_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_conversations_id_idx" ON "payload_locked_documents_rels" USING btree ("conversations_id");
  CREATE INDEX "payload_locked_documents_rels_conversation_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("conversation_messages_id");
  CREATE INDEX "payload_locked_documents_rels_knowledge_id_idx" ON "payload_locked_documents_rels" USING btree ("knowledge_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "conversations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conversation_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "knowledge" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "conversations" CASCADE;
  DROP TABLE "conversation_messages" CASCADE;
  DROP TABLE "knowledge" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_conversations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_conversation_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_knowledge_fk";
  
  DROP INDEX "payload_locked_documents_rels_conversations_id_idx";
  DROP INDEX "payload_locked_documents_rels_conversation_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_knowledge_id_idx";
  ALTER TABLE "contacts" DROP COLUMN "role";
  ALTER TABLE "contacts" DROP COLUMN "company_size";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "conversations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "conversation_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "knowledge_id";
  ALTER TABLE "settings" DROP COLUMN "handoff_phone";
  ALTER TABLE "settings" DROP COLUMN "handoff_template";
  DROP TYPE "public"."enum_conversations_status";
  DROP TYPE "public"."enum_conversation_messages_sender";`)
}

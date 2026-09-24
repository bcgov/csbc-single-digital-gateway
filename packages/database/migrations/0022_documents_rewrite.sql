-- Feature 217. Hand-edits to the drizzle-generated diff are marked "217:".
--
-- 217: dev-only purge. The `ADD COLUMN … NOT NULL` statements below (document_versions.content /
-- .version_number, documents.type) and the text→enum cast of documents.kind can only succeed on
-- EMPTY tables. There is no production data; on a fresh database these tables are already empty
-- and this is a no-op. `reviews` and `submission_versions` must be named or TRUNCATE refuses.
TRUNCATE "reviews", "submission_versions", "submissions", "service_agreement_consents",
         "workspace_default_agreements", "document_references", "document_version_contributors",
         "document_members", "document_versions", "documents";--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('document', 'template');--> statement-breakpoint
CREATE TYPE "public"."document_member_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('service', 'application-method', 'service-agreement');--> statement-breakpoint
CREATE TYPE "public"."document_version_history_action" AS ENUM('created', 'updated', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_version_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "document_version_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "document_version_history_action" NOT NULL,
	"revision" integer NOT NULL,
	"delta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_version_history_delta_chk" CHECK (("document_version_history"."action" in ('created', 'updated')) = ("document_version_history"."delta" is not null)),
	CONSTRAINT "document_version_history_created_revision_chk" CHECK ("document_version_history"."action" <> 'created' or "document_version_history"."revision" = 1)
);
--> statement-breakpoint
ALTER TABLE "document_type_versions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_types" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_references" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_version_contributors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "document_type_versions" CASCADE;--> statement-breakpoint
DROP TABLE "document_types" CASCADE;--> statement-breakpoint
DROP TABLE "document_references" CASCADE;--> statement-breakpoint
DROP TABLE "document_version_contributors" CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" DROP CONSTRAINT "workspace_default_agreements_kind_chk";--> statement-breakpoint
ALTER TABLE "document_members" DROP CONSTRAINT "document_members_document_fk";
--> statement-breakpoint
ALTER TABLE "document_members" DROP CONSTRAINT "document_members_workspace_member_fk";
--> statement-breakpoint
ALTER TABLE "document_versions" DROP CONSTRAINT "document_versions_document_fk";
--> statement-breakpoint
-- 217: IF EXISTS — `DROP TABLE … CASCADE` above already removed these two FKs along with the
-- document_types / document_type_versions unique indexes they referenced.
ALTER TABLE "document_versions" DROP CONSTRAINT IF EXISTS "document_versions_type_version_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_type_fk";
--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" DROP CONSTRAINT "workspace_default_agreements_kind_fk";
--> statement-breakpoint
-- 217: moved AFTER the foreign-key drops. drizzle emitted these first, but
-- document_versions_document_fk and documents_type_fk depend on these unique indexes, so dropping
-- them early fails with "constraint … depends on index documents_id_type_id_key".
ALTER TABLE "documents" DROP CONSTRAINT "documents_id_type_id_key";--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_id_kind_key";--> statement-breakpoint
DROP INDEX "document_members_document_id_user_id_key";--> statement-breakpoint
DROP INDEX "document_versions_document_id_version_key";--> statement-breakpoint
DROP INDEX "document_versions_type_id_idx";--> statement-breakpoint
DROP INDEX "document_versions_type_version_id_idx";--> statement-breakpoint
DROP INDEX "documents_type_id_idx";--> statement-breakpoint
DROP INDEX "documents_workspace_id_idx";--> statement-breakpoint
ALTER TABLE "document_members" ALTER COLUMN "role" SET DATA TYPE "public"."document_member_role" USING "role"::text::"public"."document_member_role";--> statement-breakpoint
-- 217: removed a redundant `ALTER COLUMN "status" SET DATA TYPE … USING …`. `status` is a
-- GENERATED column, and Postgres refuses ("cannot specify USING when altering type of generated
-- column"); the drop + re-add below already changes its type.
ALTER TABLE "document_versions" drop column "status";--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "status" "document_version_status" GENERATED ALWAYS AS (case
          when "document_versions"."archived_at" is not null then 'archived'::document_version_status
          when "document_versions"."published_at" is not null then 'published'::document_version_status
          else 'draft'::document_version_status
        end) STORED NOT NULL;--> statement-breakpoint
-- 217: drizzle dropped and re-added `status`, which took this partial unique index (it depends on
-- the column) with it, and does not re-create it. Without this line there would be nothing
-- enforcing "at most one published version per document".
CREATE UNIQUE INDEX "document_versions_one_published_key" ON "document_versions" USING btree ("document_id") WHERE "document_versions"."status" = 'published';--> statement-breakpoint
-- 217: reordered — drizzle emitted SET DEFAULT (an enum literal) while `kind` was still `text`.
ALTER TABLE "documents" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "kind" SET DATA TYPE "public"."document_kind" USING "kind"::"public"."document_kind";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "kind" SET DEFAULT 'document'::"public"."document_kind";--> statement-breakpoint
-- 217: removed a redundant `ALTER COLUMN "agreement_kind" SET DATA TYPE …` — the drop + re-add
-- below replaces the column with a GENERATED one.
ALTER TABLE "workspace_default_agreements" drop column "agreement_kind";--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" ADD COLUMN "agreement_kind" "document_kind" GENERATED ALWAYS AS ('document'::document_kind) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "document_members" ADD COLUMN "added_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "template_version_id" uuid;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "version_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "content" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "title" text GENERATED ALWAYS AS ("document_versions"."content" -> 'uischema' ->> 'label') STORED;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "description" text GENERATED ALWAYS AS ("document_versions"."content" -> 'uischema' -> 'options' ->> 'description') STORED;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "type" "document_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "template_kind" "document_kind" GENERATED ALWAYS AS ('template'::document_kind) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" ADD COLUMN "agreement_type" "document_type" GENERATED ALWAYS AS ('service-agreement'::document_type) STORED NOT NULL;--> statement-breakpoint
-- 217: moved BEFORE the foreign-key adds. drizzle emitted every UNIQUE constraint at the end of
-- the file, but documents_template_fk / document_versions_template_fk /
-- workspace_default_agreements_document_fk reference these keys, and a composite FK needs its
-- referenced unique to exist first ("there is no unique constraint matching given keys").
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_document_id_user_id_key" UNIQUE("document_id","user_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_id_type_kind_key" UNIQUE("id","type","kind");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_id_template_id_key" UNIQUE("id","template_id");--> statement-breakpoint
ALTER TABLE "document_version_history" ADD CONSTRAINT "document_version_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version_history" ADD CONSTRAINT "document_version_history_version_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_version_history_version_revision_key" ON "document_version_history" USING btree ("document_version_id","revision") WHERE "document_version_history"."action" in ('created', 'updated');--> statement-breakpoint
CREATE INDEX "document_version_history_version_created_idx" ON "document_version_history" USING btree ("document_version_id","created_at");--> statement-breakpoint
CREATE INDEX "document_version_history_user_id_idx" ON "document_version_history" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_document_fk" FOREIGN KEY ("document_id","workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_workspace_member_fk" FOREIGN KEY ("workspace_id","user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_template_fk" FOREIGN KEY ("document_id","template_id") REFERENCES "public"."documents"("id","template_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_template_version_fk" FOREIGN KEY ("template_version_id","template_id") REFERENCES "public"."document_versions"("id","document_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_fk" FOREIGN KEY ("template_id","type","template_kind") REFERENCES "public"."documents"("id","type","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" ADD CONSTRAINT "workspace_default_agreements_document_fk" FOREIGN KEY ("agreement_document_id","agreement_type","agreement_kind") REFERENCES "public"."documents"("id","type","kind") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_members_one_owner_key" ON "document_members" USING btree ("document_id") WHERE "document_members"."role" = 'owner';--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "document_versions_template_version_id_idx" ON "document_versions" USING btree ("template_version_id");--> statement-breakpoint
CREATE INDEX "documents_kind_type_idx" ON "documents" USING btree ("kind","type");--> statement-breakpoint
CREATE INDEX "documents_workspace_id_kind_type_idx" ON "documents" USING btree ("workspace_id","kind","type");--> statement-breakpoint
CREATE INDEX "documents_template_id_idx" ON "documents" USING btree ("template_id");--> statement-breakpoint
ALTER TABLE "document_versions" DROP COLUMN "type_id";--> statement-breakpoint
ALTER TABLE "document_versions" DROP COLUMN "type_version_id";--> statement-breakpoint
ALTER TABLE "document_versions" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "document_versions" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "document_versions" DROP COLUMN "schema";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "type_id";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_template_pair_chk" CHECK (("document_versions"."template_id" is null) = ("document_versions"."template_version_id" is null));--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_only_on_document_chk" CHECK ("documents"."kind" = 'document' or "documents"."template_id" is null);--> statement-breakpoint
DROP TYPE "public"."document_type_versions_status";--> statement-breakpoint
DROP TYPE "public"."document_members_role";--> statement-breakpoint
DROP TYPE "public"."document_references_relation";--> statement-breakpoint
DROP TYPE "public"."document_versions_status";
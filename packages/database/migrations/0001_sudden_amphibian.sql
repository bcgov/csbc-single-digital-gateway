CREATE TYPE "public"."workspace_members_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."workspace_members_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."document_type_versions_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_members_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."document_versions_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."submissions_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"issuer" text NOT NULL,
	"sub" text NOT NULL,
	"display_name" text NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"email" "citext",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" "workspace_members_role" NOT NULL,
	"status" "workspace_members_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_user_id_workspace_id_key" UNIQUE("user_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text DEFAULT nanoid(8) NOT NULL,
	"name" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_type_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "document_type_versions_status" GENERATED ALWAYS AS (CASE WHEN archived_at IS NOT NULL THEN 'archived'::document_type_versions_status WHEN published_at IS NOT NULL THEN 'published'::document_type_versions_status ELSE 'draft'::document_type_versions_status END) STORED NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_type_versions_id_type_id_key" UNIQUE("id","type_id")
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" "document_members_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_version_contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"first_update_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_update_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"type_version_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "document_versions_status" GENERATED ALWAYS AS (CASE WHEN archived_at IS NOT NULL THEN 'archived'::document_versions_status WHEN published_at IS NOT NULL THEN 'published'::document_versions_status ELSE 'draft'::document_versions_status END) STORED NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_id_document_id_key" UNIQUE("id","document_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_id_type_id_key" UNIQUE("id","type_id"),
	CONSTRAINT "documents_id_workspace_id_key" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"user_id" uuid,
	"workspace_id" uuid NOT NULL,
	"status" "submissions_status" GENERATED ALWAYS AS (CASE WHEN submitted_at IS NOT NULL THEN 'submitted'::submissions_status ELSE 'draft'::submissions_status END) STORED NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_type_versions" ADD CONSTRAINT "document_type_versions_type_id_document_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."document_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_document_fk" FOREIGN KEY ("document_id","workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_workspace_member_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspace_members"("user_id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version_contributors" ADD CONSTRAINT "document_version_contributors_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version_contributors" ADD CONSTRAINT "document_version_contributors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_fk" FOREIGN KEY ("document_id","type_id") REFERENCES "public"."documents"("id","type_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_type_version_fk" FOREIGN KEY ("type_version_id","type_id") REFERENCES "public"."document_type_versions"("id","type_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_type_id_document_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."document_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_document_fk" FOREIGN KEY ("document_id","workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_document_version_fk" FOREIGN KEY ("document_version_id","document_id") REFERENCES "public"."document_versions"("id","document_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identities_issuer_sub_key" ON "identities" USING btree ("issuer","sub");--> statement-breakpoint
CREATE INDEX "identities_user_id_idx" ON "identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "document_type_versions_type_id_version_key" ON "document_type_versions" USING btree ("type_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "document_type_versions_one_published_key" ON "document_type_versions" USING btree ("type_id") WHERE status = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "document_members_document_id_user_id_key" ON "document_members" USING btree ("document_id","user_id");--> statement-breakpoint
CREATE INDEX "document_members_user_id_workspace_id_idx" ON "document_members" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_version_contributors_dv_id_user_id_key" ON "document_version_contributors" USING btree ("document_version_id","user_id");--> statement-breakpoint
CREATE INDEX "document_version_contributors_user_id_idx" ON "document_version_contributors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_id_version_key" ON "document_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE INDEX "document_versions_type_id_idx" ON "document_versions" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "document_versions_type_version_id_idx" ON "document_versions" USING btree ("type_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_one_published_key" ON "document_versions" USING btree ("document_id") WHERE status = 'published';--> statement-breakpoint
CREATE INDEX "documents_type_id_idx" ON "documents" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "documents_workspace_id_idx" ON "documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "submissions_document_version_id_created_at_idx" ON "submissions" USING btree ("document_version_id","created_at");--> statement-breakpoint
CREATE INDEX "submissions_document_id_idx" ON "submissions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "submissions_user_id_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_workspace_id_idx" ON "submissions" USING btree ("workspace_id");
CREATE TYPE "public"."consent_document_contributor_role" AS ENUM('owner');--> statement-breakpoint
CREATE TYPE "public"."consent_document_version_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."consent_statement_action" AS ENUM('approve', 'deny', 'revoke');--> statement-breakpoint
CREATE TYPE "public"."org_unit_member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."org_unit_type" AS ENUM('org', 'division', 'branch', 'team');--> statement-breakpoint
CREATE TYPE "public"."service_contributor_role" AS ENUM('owner');--> statement-breakpoint
CREATE TYPE "public"."service_version_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'staff', 'citizen');--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"issuer" text NOT NULL,
	"sub" text NOT NULL,
	"claims" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_document_contributors" (
	"consent_document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "consent_document_contributor_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_document_contributors_consent_document_id_user_id_pk" PRIMARY KEY("consent_document_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "consent_document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_document_types_schemaId_unique" UNIQUE("schema_id")
);
--> statement-breakpoint
CREATE TABLE "consent_document_version_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_document_version_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_document_id" uuid NOT NULL,
	"schema_version_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "consent_document_version_status" NOT NULL,
	"archived_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_document_type_id" uuid NOT NULL,
	"org_unit_id" uuid NOT NULL,
	"published_consent_document_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_statements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"consent_document_version_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "consent_statement_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_unit_members" (
	"org_unit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_unit_member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_unit_members_org_unit_id_user_id_pk" PRIMARY KEY("org_unit_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "org_unit_relations" (
	"ancestor_id" uuid NOT NULL,
	"descendant_id" uuid NOT NULL,
	"depth" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_unit_relations_ancestor_id_descendant_id_pk" PRIMARY KEY("ancestor_id","descendant_id")
);
--> statement-breakpoint
CREATE TABLE "org_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "org_unit_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schema_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"schema" jsonb DEFAULT '{}' NOT NULL,
	"ui_schema" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_schema_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_contributors" (
	"service_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "service_contributor_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_contributors_service_id_user_id_pk" PRIMARY KEY("service_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_version_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_version_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_version_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "service_version_status" NOT NULL,
	"archived_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_unit_id" uuid NOT NULL,
	"published_service_version_id" uuid,
	"service_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_serviceTypeId_unique" UNIQUE("service_type_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document_contributors" ADD CONSTRAINT "consent_document_contributors_consent_document_id_consent_documents_id_fk" FOREIGN KEY ("consent_document_id") REFERENCES "public"."consent_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document_contributors" ADD CONSTRAINT "consent_document_contributors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document_types" ADD CONSTRAINT "consent_document_types_schema_id_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document_version_translations" ADD CONSTRAINT "consent_document_version_translations_consent_document_version_id_consent_document_versions_id_fk" FOREIGN KEY ("consent_document_version_id") REFERENCES "public"."consent_document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document_versions" ADD CONSTRAINT "consent_document_versions_consent_document_id_consent_documents_id_fk" FOREIGN KEY ("consent_document_id") REFERENCES "public"."consent_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_document_versions" ADD CONSTRAINT "consent_document_versions_schema_version_id_schema_versions_id_fk" FOREIGN KEY ("schema_version_id") REFERENCES "public"."schema_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_documents" ADD CONSTRAINT "consent_documents_consent_document_type_id_consent_document_types_id_fk" FOREIGN KEY ("consent_document_type_id") REFERENCES "public"."consent_document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_documents" ADD CONSTRAINT "consent_documents_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_documents" ADD CONSTRAINT "consent_documents_published_consent_document_version_id_consent_document_versions_id_fk" FOREIGN KEY ("published_consent_document_version_id") REFERENCES "public"."consent_document_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_statements" ADD CONSTRAINT "consent_statements_consent_document_version_id_consent_document_versions_id_fk" FOREIGN KEY ("consent_document_version_id") REFERENCES "public"."consent_document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_statements" ADD CONSTRAINT "consent_statements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_unit_members" ADD CONSTRAINT "org_unit_members_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_unit_members" ADD CONSTRAINT "org_unit_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_unit_relations" ADD CONSTRAINT "org_unit_relations_ancestor_id_org_units_id_fk" FOREIGN KEY ("ancestor_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_unit_relations" ADD CONSTRAINT "org_unit_relations_descendant_id_org_units_id_fk" FOREIGN KEY ("descendant_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_versions" ADD CONSTRAINT "schema_versions_schema_id_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schemas" ADD CONSTRAINT "schemas_published_schema_version_id_schema_versions_id_fk" FOREIGN KEY ("published_schema_version_id") REFERENCES "public"."schema_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_contributors" ADD CONSTRAINT "service_contributors_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_contributors" ADD CONSTRAINT "service_contributors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_schema_id_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_version_translations" ADD CONSTRAINT "service_version_translations_service_version_id_service_versions_id_fk" FOREIGN KEY ("service_version_id") REFERENCES "public"."service_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_schema_version_id_schema_versions_id_fk" FOREIGN KEY ("schema_version_id") REFERENCES "public"."schema_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_published_service_version_id_service_versions_id_fk" FOREIGN KEY ("published_service_version_id") REFERENCES "public"."service_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identities_issuer_sub_unique" ON "identities" USING btree ("issuer","sub");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_document_version_translations_consent_document_version_locale_unique" ON "consent_document_version_translations" USING btree ("consent_document_version_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_document_versions_consent_document_version_unique" ON "consent_document_versions" USING btree ("consent_document_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "schema_versions_schema_version_unique" ON "schema_versions" USING btree ("schema_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "service_version_translation_service_version_locale_unique" ON "service_version_translations" USING btree ("service_version_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "service_versions_service_version_unique" ON "service_versions" USING btree ("service_id","version");
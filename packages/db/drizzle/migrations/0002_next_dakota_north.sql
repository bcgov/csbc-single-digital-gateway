CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"service_version_id" uuid NOT NULL,
	"service_version_translation_id" uuid NOT NULL,
	"service_application_id" uuid NOT NULL,
	"service_application_type" text NOT NULL,
	"user_id" uuid NOT NULL,
	"delegate_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_document_type_version_translations" ALTER COLUMN "schema" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "consent_document_type_version_translations" ALTER COLUMN "ui_schema" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "consent_document_version_translations" ALTER COLUMN "content" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "service_type_version_translations" ALTER COLUMN "schema" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "service_type_version_translations" ALTER COLUMN "ui_schema" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "service_version_translations" ALTER COLUMN "content" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_version_id_service_versions_id_fk" FOREIGN KEY ("service_version_id") REFERENCES "public"."service_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_service_version_translation_id_service_version_translations_id_fk" FOREIGN KEY ("service_version_translation_id") REFERENCES "public"."service_version_translations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_delegate_user_id_users_id_fk" FOREIGN KEY ("delegate_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_id_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_service_id_idx" ON "applications" USING btree ("service_id");
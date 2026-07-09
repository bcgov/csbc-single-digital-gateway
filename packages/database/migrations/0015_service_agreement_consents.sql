CREATE TYPE "public"."service_agreement_consents_decision" AS ENUM('approve', 'reject');--> statement-breakpoint
CREATE TABLE "service_agreement_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agreement_document_id" uuid NOT NULL,
	"agreement_version_id" uuid NOT NULL,
	"decision" "service_agreement_consents_decision" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_agreement_consents" ADD CONSTRAINT "service_agreement_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_agreement_consents" ADD CONSTRAINT "service_agreement_consents_version_fk" FOREIGN KEY ("agreement_version_id","agreement_document_id") REFERENCES "public"."document_versions"("id","document_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_agreement_consents_user_version_created_idx" ON "service_agreement_consents" USING btree ("user_id","agreement_version_id","created_at");--> statement-breakpoint
CREATE INDEX "service_agreement_consents_agreement_document_id_idx" ON "service_agreement_consents" USING btree ("agreement_document_id");
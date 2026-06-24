CREATE TYPE "public"."submission_versions_status" AS ENUM('draft', 'pending', 'in_review', 'approved', 'rejected', 'needs_changes', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."reviews_decision" AS ENUM('approved', 'rejected', 'flagged', 'needs_changes', 'escalated', 'no_action');--> statement-breakpoint
CREATE TABLE "submission_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "submission_versions_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_versions_id_submission_id_key" UNIQUE("id","submission_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_version_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "reviews_decision" NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "submissions_document_version_id_created_at_idx";--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_id_workspace_id_key" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submission_fk" FOREIGN KEY ("submission_id","workspace_id") REFERENCES "public"."submissions"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_version_fk" FOREIGN KEY ("submission_version_id","submission_id") REFERENCES "public"."submission_versions"("id","submission_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_fk" FOREIGN KEY ("submission_id","workspace_id") REFERENCES "public"."submissions"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "submission_versions_submission_id_version_key" ON "submission_versions" USING btree ("submission_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_versions_one_approved_key" ON "submission_versions" USING btree ("submission_id") WHERE status = 'approved';--> statement-breakpoint
CREATE INDEX "submission_versions_workspace_id_status_idx" ON "submission_versions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "submission_versions_status_idx" ON "submission_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_submission_version_id_idx" ON "reviews" USING btree ("submission_version_id");--> statement-breakpoint
CREATE INDEX "reviews_submission_id_created_at_idx" ON "reviews" USING btree ("submission_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews" USING btree ("reviewer_id");--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "submitted_at";
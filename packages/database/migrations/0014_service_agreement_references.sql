ALTER TABLE "document_references" DROP CONSTRAINT "document_references_relation_kind_chk";--> statement-breakpoint
ALTER TABLE "document_references" DROP CONSTRAINT "document_references_target_ws_fk";
--> statement-breakpoint
ALTER TABLE "document_references" ADD COLUMN "target_workspace_id" uuid;--> statement-breakpoint
-- Backfill: existing references are all same-workspace (services + their forms), so the target's
-- workspace equals the shared workspace_id. Must run BEFORE target_ws_global_only_chk (which
-- rejects a NULL target_workspace_id for any non-service_agreement relation).
UPDATE "document_references" SET "target_workspace_id" = "workspace_id";--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_target_ws_fk" FOREIGN KEY ("target_document_id","target_workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_target_ws_scope_chk" CHECK ("document_references"."target_workspace_id" IS NULL OR "document_references"."target_workspace_id" = "document_references"."workspace_id");--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_target_ws_global_only_chk" CHECK ("document_references"."target_workspace_id" IS NOT NULL OR "document_references"."relation"::text = 'service_agreement');--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_relation_kind_chk" CHECK (("document_references"."relation" = 'related_service' AND "document_references"."target_kind" = 'service') OR ("document_references"."relation" = 'application_form' AND "document_references"."target_kind" IN ('basic-form', 'multi-stage-form')) OR ("document_references"."relation"::text = 'service_agreement' AND "document_references"."target_kind" = 'service-agreement'));
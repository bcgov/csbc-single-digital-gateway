ALTER TABLE "document_references" ALTER COLUMN "target_version_id" DROP NOT NULL;--> statement-breakpoint
-- Collapse existing service_agreement references to document-only pointers: drop the version pin so
-- both citizen and staff resolve the agreement document's current published version (initiative
-- shared-service-agreements). application_form / related_service keep their pins.
UPDATE "document_references" SET "target_version_id" = NULL WHERE "relation"::text = 'service_agreement';--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_agreement_no_version_chk" CHECK ("document_references"."target_version_id" IS NOT NULL OR "document_references"."relation"::text = 'service_agreement');
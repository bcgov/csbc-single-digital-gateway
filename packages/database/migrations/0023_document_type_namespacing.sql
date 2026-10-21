-- Feature 226. Namespace the document types under `services.*`.
--
-- 226: HAND-WRITTEN, replacing drizzle-kit's diff. drizzle re-creates the enum (cast both columns to
-- text, DROP TYPE, CREATE TYPE, cast back), which fails outright: the text → enum cast back cannot
-- map the OLD labels to the new ones, and `documents.type` sits in the `documents_id_type_kind_key`
-- unique that two composite FKs target. RENAME VALUE keeps each label's OID, so every existing row,
-- the composite FKs, the indexes and the STORED `workspace_default_agreements.agreement_type`
-- expression (an enum constant is stored by OID, not by label) all carry over with no rewrite.
ALTER TYPE "public"."document_type" RENAME VALUE 'service' TO 'services.service';--> statement-breakpoint
ALTER TYPE "public"."document_type" RENAME VALUE 'application-method' TO 'services.service-application-method';--> statement-breakpoint
ALTER TYPE "public"."document_type" RENAME VALUE 'service-agreement' TO 'services.service-agreement';

CREATE TYPE "public"."document_references_relation" AS ENUM('related_service', 'application_form');--> statement-breakpoint
CREATE TABLE "document_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_version_id" uuid NOT NULL,
	"owner_document_id" uuid NOT NULL,
	"owner_kind" text NOT NULL,
	"target_version_id" uuid NOT NULL,
	"target_document_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"relation" "document_references_relation" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_references_owner_version_target_doc_key" UNIQUE("owner_version_id","target_document_id"),
	CONSTRAINT "document_references_owner_kind_chk" CHECK ("document_references"."owner_kind" = 'service'),
	CONSTRAINT "document_references_relation_kind_chk" CHECK (("document_references"."relation" = 'related_service' AND "document_references"."target_kind" = 'service') OR ("document_references"."relation" = 'application_form' AND "document_references"."target_kind" IN ('basic-form', 'multi-stage-form'))),
	CONSTRAINT "document_references_no_self_chk" CHECK ("document_references"."owner_document_id" <> "document_references"."target_document_id")
);
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_type_id_document_types_id_fk";--> statement-breakpoint
-- Denormalize `kind`: add nullable, backfill from the type, then enforce NOT NULL (existing rows).
ALTER TABLE "documents" ADD COLUMN "kind" text;--> statement-breakpoint
UPDATE "documents" SET "kind" = dt."kind" FROM "document_types" dt WHERE dt."id" = "documents"."type_id";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
-- UNIQUE targets must exist BEFORE the FKs that reference them (drizzle orders FK ALTERs first).
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_id_kind_key" UNIQUE("id","kind");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_id_kind_key" UNIQUE("id","kind");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_type_fk" FOREIGN KEY ("type_id","kind") REFERENCES "public"."document_types"("id","kind") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_owner_version_fk" FOREIGN KEY ("owner_version_id","owner_document_id") REFERENCES "public"."document_versions"("id","document_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_target_version_fk" FOREIGN KEY ("target_version_id","target_document_id") REFERENCES "public"."document_versions"("id","document_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_owner_kind_fk" FOREIGN KEY ("owner_document_id","owner_kind") REFERENCES "public"."documents"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_target_kind_fk" FOREIGN KEY ("target_document_id","target_kind") REFERENCES "public"."documents"("id","kind") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_owner_ws_fk" FOREIGN KEY ("owner_document_id","workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_target_ws_fk" FOREIGN KEY ("target_document_id","workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_references_target_document_id_idx" ON "document_references" USING btree ("target_document_id");--> statement-breakpoint
CREATE INDEX "document_references_owner_version_id_idx" ON "document_references" USING btree ("owner_version_id");--> statement-breakpoint
CREATE INDEX "document_references_workspace_id_idx" ON "document_references" USING btree ("workspace_id");

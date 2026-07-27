CREATE TABLE "workspace_default_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"agreement_document_id" uuid NOT NULL,
	"agreement_kind" text NOT NULL,
	"agreement_workspace_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_default_agreements_ws_doc_key" UNIQUE("workspace_id","agreement_document_id"),
	CONSTRAINT "workspace_default_agreements_kind_chk" CHECK ("workspace_default_agreements"."agreement_kind" = 'service-agreement'),
	CONSTRAINT "workspace_default_agreements_ws_scope_chk" CHECK ("workspace_default_agreements"."agreement_workspace_id" IS NULL OR "workspace_default_agreements"."agreement_workspace_id" = "workspace_default_agreements"."workspace_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" ADD CONSTRAINT "workspace_default_agreements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" ADD CONSTRAINT "workspace_default_agreements_kind_fk" FOREIGN KEY ("agreement_document_id","agreement_kind") REFERENCES "public"."documents"("id","kind") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_default_agreements" ADD CONSTRAINT "workspace_default_agreements_ws_fk" FOREIGN KEY ("agreement_document_id","agreement_workspace_id") REFERENCES "public"."documents"("id","workspace_id") ON DELETE restrict ON UPDATE no action;
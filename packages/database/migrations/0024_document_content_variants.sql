ALTER TABLE "document_versions" drop column "title";--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "title" text GENERATED ALWAYS AS ("document_versions"."content" -> 'variants' -> 'default' ->> 'label') STORED;--> statement-breakpoint
ALTER TABLE "document_versions" drop column "description";--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "description" text GENERATED ALWAYS AS ("document_versions"."content" -> 'variants' -> 'default' -> 'options' ->> 'description') STORED;
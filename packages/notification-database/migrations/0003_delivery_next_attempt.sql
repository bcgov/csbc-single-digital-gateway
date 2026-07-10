DROP INDEX "deliveries_channel_status_idx";--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "deliveries_claim_idx" ON "deliveries" USING btree ("channel","status","next_attempt_at");
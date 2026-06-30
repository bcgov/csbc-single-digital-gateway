-- Add workspaces.owner_user_id (feature 57). Hand-split from the generated `ADD COLUMN ... NOT NULL`
-- because `workspaces` may be non-empty: add nullable + FK, backfill each workspace's oldest active
-- admin as owner, then SET NOT NULL. Statement order does not affect the drizzle snapshot.
ALTER TABLE "workspaces" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
UPDATE "workspaces" w
SET "owner_user_id" = (
  SELECT m."user_id"
  FROM "workspace_members" m
  WHERE m."workspace_id" = w."id"
    AND m."role" = 'admin'
    AND m."status" = 'active'
  ORDER BY m."created_at" ASC, m."id" ASC
  LIMIT 1
)
WHERE w."owner_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "owner_user_id" SET NOT NULL;

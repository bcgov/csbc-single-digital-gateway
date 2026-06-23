CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'citizen');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roles" "user_role"[] DEFAULT '{}' NOT NULL;
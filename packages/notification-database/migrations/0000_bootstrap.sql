-- Bootstrap: everything the generated table migrations depend on, so it must run first.
-- drizzle-kit cannot diff extensions or functions — this file is a hand-written custom
-- migration (drizzle-kit generate --custom).
CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

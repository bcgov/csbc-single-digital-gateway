-- Attach the set_updated_at() trigger (defined in 0000) to every table that has an
-- updated_at column, so the DB maintains it on every UPDATE. Tables WITHOUT updated_at
-- (identities, document_version_contributors) are intentionally excluded.

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER workspaces_set_updated_at BEFORE UPDATE ON "workspaces"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER workspace_members_set_updated_at BEFORE UPDATE ON "workspace_members"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER document_types_set_updated_at BEFORE UPDATE ON "document_types"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER document_type_versions_set_updated_at BEFORE UPDATE ON "document_type_versions"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON "documents"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER document_members_set_updated_at BEFORE UPDATE ON "document_members"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER document_versions_set_updated_at BEFORE UPDATE ON "document_versions"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER submissions_set_updated_at BEFORE UPDATE ON "submissions"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

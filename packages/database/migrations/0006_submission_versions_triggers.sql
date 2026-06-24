-- Attach set_updated_at() (defined in 0000) to submission_versions, which gained an
-- updated_at column in 0004. submissions already has its trigger from 0002; reviews is
-- intentionally excluded (append-only / immutable — no updated_at column).

CREATE TRIGGER submission_versions_set_updated_at BEFORE UPDATE ON "submission_versions"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

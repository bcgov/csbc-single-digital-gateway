-- Attach set_updated_at() (defined in 0000) to document_references, which carries an updated_at
-- column (references are reorderable via `position`). Mirrors every other table with updated_at.

CREATE TRIGGER document_references_set_updated_at BEFORE UPDATE ON "document_references"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

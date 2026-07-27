-- Attach set_updated_at() (0000_bootstrap) — the relay updates outbox rows.
CREATE TRIGGER notification_outbox_set_updated_at BEFORE UPDATE ON "notification_outbox"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

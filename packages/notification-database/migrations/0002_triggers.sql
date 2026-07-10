-- Attach set_updated_at() (0000_bootstrap) to every table with an updated_at column.
-- notifications is intentionally excluded: it is append-only/immutable (no updated_at).
CREATE TRIGGER recipients_set_updated_at BEFORE UPDATE ON "recipients"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER channel_preferences_set_updated_at BEFORE UPDATE ON "channel_preferences"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER deliveries_set_updated_at BEFORE UPDATE ON "deliveries"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

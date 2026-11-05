CREATE FUNCTION cash_sessions_immutable() RETURNS trigger AS $$
BEGIN
	IF OLD.status = 'closed' THEN
		RAISE EXCEPTION 'closed cash_sessions rows are immutable' USING ERRCODE = 'restrict_violation';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER cash_sessions_closed_immutable
BEFORE UPDATE OR DELETE ON cash_sessions
FOR EACH ROW EXECUTE FUNCTION cash_sessions_immutable();
--> statement-breakpoint
CREATE FUNCTION cash_movements_require_open_session() RETURNS trigger AS $$
DECLARE
	session_row cash_sessions%ROWTYPE;
BEGIN
	SELECT * INTO session_row FROM cash_sessions WHERE id = NEW.session_id FOR SHARE;
	IF session_row.status IS DISTINCT FROM 'open' THEN
		RAISE EXCEPTION 'cash_movements need an open cash session' USING ERRCODE = 'restrict_violation';
	END IF;
	IF session_row.warehouse_id <> NEW.warehouse_id THEN
		RAISE EXCEPTION 'cash_movements must use the warehouse of their cash session' USING ERRCODE = 'restrict_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER cash_movements_open_session
BEFORE INSERT ON cash_movements
FOR EACH ROW EXECUTE FUNCTION cash_movements_require_open_session();

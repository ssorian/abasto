CREATE FUNCTION ledger_append_only() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER cash_movements_no_update_delete
BEFORE UPDATE OR DELETE ON cash_movements
FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
--> statement-breakpoint
CREATE TRIGGER cash_movements_no_truncate
BEFORE TRUNCATE ON cash_movements
FOR EACH STATEMENT EXECUTE FUNCTION append_only_no_truncate();
--> statement-breakpoint
CREATE TRIGGER customer_ledger_no_update_delete
BEFORE UPDATE OR DELETE ON customer_ledger
FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
--> statement-breakpoint
CREATE TRIGGER customer_ledger_no_truncate
BEFORE TRUNCATE ON customer_ledger
FOR EACH STATEMENT EXECUTE FUNCTION append_only_no_truncate();

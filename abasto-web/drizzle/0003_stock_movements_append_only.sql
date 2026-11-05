CREATE FUNCTION stock_movements_append_only() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'stock_movements is append-only' USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER stock_movements_no_update_delete
BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION stock_movements_append_only();

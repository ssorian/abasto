CREATE FUNCTION append_only_no_truncate() RETURNS trigger AS $$
BEGIN
	IF current_setting('abasto.allow_truncate', true) = 'on' THEN
		RETURN NULL;
	END IF;
	RAISE EXCEPTION '% is append-only: TRUNCATE is not allowed', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER stock_movements_no_truncate
BEFORE TRUNCATE ON stock_movements
FOR EACH STATEMENT EXECUTE FUNCTION append_only_no_truncate();
--> statement-breakpoint
CREATE TRIGGER presentation_prices_no_truncate
BEFORE TRUNCATE ON presentation_prices
FOR EACH STATEMENT EXECUTE FUNCTION append_only_no_truncate();

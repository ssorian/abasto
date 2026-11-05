CREATE TABLE "presentation_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"presentation_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "presentation_prices_price_min" CHECK ("presentation_prices"."price_cents" > 0),
	CONSTRAINT "presentation_prices_source_check" CHECK ("presentation_prices"."source" in ('manual', 'bulk', 'purchase-suggestion'))
);
--> statement-breakpoint
CREATE TABLE "product_margins" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"margin_bps" integer NOT NULL,
	CONSTRAINT "product_margins_bps_min" CHECK ("product_margins"."margin_bps" >= 0)
);
--> statement-breakpoint
ALTER TABLE "presentation_prices" ADD CONSTRAINT "presentation_prices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_prices" ADD CONSTRAINT "presentation_prices_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_prices" ADD CONSTRAINT "presentation_prices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_margins" ADD CONSTRAINT "product_margins_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "presentation_prices_current_idx" ON "presentation_prices" USING btree ("warehouse_id","presentation_id","effective_from");--> statement-breakpoint
CREATE FUNCTION presentation_prices_append_only() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'presentation_prices is append-only' USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER presentation_prices_no_update_delete
BEFORE UPDATE OR DELETE ON presentation_prices
FOR EACH ROW EXECUTE FUNCTION presentation_prices_append_only();

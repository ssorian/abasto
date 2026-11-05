CREATE TABLE "order_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_line_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_allocations_quantity_min" CHECK ("order_allocations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"presentation_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"base_quantity" integer NOT NULL,
	"list_price_cents" integer NOT NULL,
	"rule_min_quantity" integer,
	"rule_discount_bps" integer,
	"rule_price_cents" integer,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	CONSTRAINT "order_lines_quantity_min" CHECK ("order_lines"."quantity" > 0),
	CONSTRAINT "order_lines_base_quantity_min" CHECK ("order_lines"."base_quantity" > 0),
	CONSTRAINT "order_lines_unit_price_min" CHECK ("order_lines"."unit_price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"reservation_hours" integer DEFAULT 24 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_settings_single_row" CHECK ("order_settings"."id" = 1),
	CONSTRAINT "order_settings_hours_range" CHECK ("order_settings"."reservation_hours" between 1 and 720)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"total_cents" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"prepared_at" timestamp,
	"closed_at" timestamp,
	CONSTRAINT "orders_total_min" CHECK ("orders"."total_cents" > 0),
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('Reservado', 'Preparado', 'Recogido', 'Cancelado', 'Vencido'))
);
--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_type_check";--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "reserved" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_order_line_id_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_allocations" ADD CONSTRAINT "order_allocations_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_settings" ADD CONSTRAINT "order_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_allocations_line_idx" ON "order_allocations" USING btree ("order_line_id");--> statement-breakpoint
CREATE INDEX "order_allocations_lot_idx" ON "order_allocations" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "order_lines_order_idx" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_warehouse_status_idx" ON "orders" USING btree ("warehouse_id","status","expires_at");--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_reserved_range" CHECK ("lots"."reserved" >= 0 and "lots"."reserved" <= "lots"."on_hand");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_type_check" CHECK ("stock_movements"."type" in ('purchase', 'adjustment', 'loss', 'count', 'sale'));
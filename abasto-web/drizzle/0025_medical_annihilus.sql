CREATE TABLE "rider_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"price_factor" integer NOT NULL,
	"leftover_quantity" integer,
	"sold_quantity" integer,
	CONSTRAINT "rider_allocations_quantity_min" CHECK ("rider_allocations"."quantity" > 0),
	CONSTRAINT "rider_allocations_price_min" CHECK ("rider_allocations"."price_cents" > 0),
	CONSTRAINT "rider_allocations_factor_min" CHECK ("rider_allocations"."price_factor" > 0),
	CONSTRAINT "rider_allocations_settlement_range" CHECK (("rider_allocations"."leftover_quantity" is null and "rider_allocations"."sold_quantity" is null) or ("rider_allocations"."leftover_quantity" >= 0 and "rider_allocations"."sold_quantity" >= 0 and "rider_allocations"."leftover_quantity" + "rider_allocations"."sold_quantity" = "rider_allocations"."quantity"))
);
--> statement-breakpoint
CREATE TABLE "rider_assignment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"box_factor" integer NOT NULL,
	"assigned_quantity" integer NOT NULL,
	"leftover_quantity" integer,
	CONSTRAINT "rider_lines_assigned_min" CHECK ("rider_assignment_lines"."assigned_quantity" > 0),
	CONSTRAINT "rider_lines_box_factor_min" CHECK ("rider_assignment_lines"."box_factor" > 0),
	CONSTRAINT "rider_lines_leftover_range" CHECK ("rider_assignment_lines"."leftover_quantity" is null or ("rider_assignment_lines"."leftover_quantity" >= 0 and "rider_assignment_lines"."leftover_quantity" <= "rider_assignment_lines"."assigned_quantity"))
);
--> statement-breakpoint
CREATE TABLE "rider_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_by" text,
	"closed_at" timestamp,
	"expected_cents" integer,
	"delivered_cents" integer,
	"difference_cents" integer,
	"cash_movement_id" uuid,
	CONSTRAINT "rider_assignments_status_check" CHECK ("rider_assignments"."status" in ('En ruta', 'Liquidada', 'Cancelada')),
	CONSTRAINT "rider_assignments_closing_consistent" CHECK (("rider_assignments"."status" = 'En ruta') = ("rider_assignments"."closed_at" is null and "rider_assignments"."closed_by" is null)),
	CONSTRAINT "rider_assignments_settlement_consistent" CHECK (("rider_assignments"."status" = 'Liquidada') = ("rider_assignments"."expected_cents" is not null and "rider_assignments"."delivered_cents" is not null and "rider_assignments"."difference_cents" is not null)),
	CONSTRAINT "rider_assignments_amounts_min" CHECK (("rider_assignments"."expected_cents" is null or "rider_assignments"."expected_cents" >= 0) and ("rider_assignments"."delivered_cents" is null or "rider_assignments"."delivered_cents" >= 0))
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "riders_name_not_blank" CHECK (length(btrim("riders"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "rider_allocations" ADD CONSTRAINT "rider_allocations_line_id_rider_assignment_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."rider_assignment_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_allocations" ADD CONSTRAINT "rider_allocations_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignment_lines" ADD CONSTRAINT "rider_assignment_lines_assignment_id_rider_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."rider_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignment_lines" ADD CONSTRAINT "rider_assignment_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignments" ADD CONSTRAINT "rider_assignments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignments" ADD CONSTRAINT "rider_assignments_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignments" ADD CONSTRAINT "rider_assignments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignments" ADD CONSTRAINT "rider_assignments_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_assignments" ADD CONSTRAINT "rider_assignments_cash_movement_id_cash_movements_id_fk" FOREIGN KEY ("cash_movement_id") REFERENCES "public"."cash_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rider_allocations_line_idx" ON "rider_allocations" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "rider_allocations_lot_idx" ON "rider_allocations" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "rider_lines_assignment_idx" ON "rider_assignment_lines" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_assignments_one_open_per_rider" ON "rider_assignments" USING btree ("rider_id") WHERE "rider_assignments"."status" = 'En ruta';--> statement-breakpoint
CREATE INDEX "rider_assignments_warehouse_idx" ON "rider_assignments" USING btree ("warehouse_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "riders_warehouse_name_unique" ON "riders" USING btree ("warehouse_id",lower("name"));
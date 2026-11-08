CREATE TABLE "supplier_pendings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"purchase_id" uuid,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"value_cents" integer NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "supplier_pendings_type_check" CHECK ("supplier_pendings"."type" in ('damaged', 'missing', 'replaced', 'written_off')),
	CONSTRAINT "supplier_pendings_sign" CHECK (("supplier_pendings"."type" in ('damaged', 'missing') and "supplier_pendings"."quantity" > 0 and "supplier_pendings"."value_cents" >= 0) or ("supplier_pendings"."type" in ('replaced', 'written_off') and "supplier_pendings"."quantity" < 0 and "supplier_pendings"."value_cents" <= 0))
);
--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "box_factor" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "good_quantity" integer;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "damaged_quantity" integer;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "status" text DEFAULT 'Recibido' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "expected_on" date;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "received_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "received_by" text;--> statement-breakpoint
-- Existing purchases were entered directly: they are received, in full, by their author.
UPDATE "purchases" SET "status" = 'Recibido', "received_at" = "created_at", "received_by" = "created_by";--> statement-breakpoint
UPDATE "purchase_lines" SET "good_quantity" = "quantity", "damaged_quantity" = 0;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "status" SET DEFAULT 'Pedido';--> statement-breakpoint
ALTER TABLE "supplier_pendings" ADD CONSTRAINT "supplier_pendings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_pendings" ADD CONSTRAINT "supplier_pendings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_pendings" ADD CONSTRAINT "supplier_pendings_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_pendings" ADD CONSTRAINT "supplier_pendings_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_pendings_supplier_product_idx" ON "supplier_pendings" USING btree ("supplier_id","product_id");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_box_factor_min" CHECK ("purchase_lines"."box_factor" > 0);--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_reception_range" CHECK (("purchase_lines"."good_quantity" is null and "purchase_lines"."damaged_quantity" is null) or ("purchase_lines"."good_quantity" >= 0 and "purchase_lines"."damaged_quantity" >= 0 and "purchase_lines"."good_quantity" + "purchase_lines"."damaged_quantity" <= "purchase_lines"."quantity"));--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_status_check" CHECK ("purchases"."status" in ('Pedido', 'Recibido', 'Cancelado'));--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_reception_consistent" CHECK (("purchases"."status" = 'Recibido' and "purchases"."received_at" is not null and "purchases"."received_by" is not null) or ("purchases"."status" <> 'Recibido' and "purchases"."received_at" is null and "purchases"."received_by" is null));--> statement-breakpoint
CREATE FUNCTION supplier_pendings_append_only() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'supplier_pendings is append-only' USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER supplier_pendings_no_update_delete
BEFORE UPDATE OR DELETE ON supplier_pendings
FOR EACH ROW EXECUTE FUNCTION supplier_pendings_append_only();
--> statement-breakpoint
CREATE TRIGGER supplier_pendings_no_truncate
BEFORE TRUNCATE ON supplier_pendings
FOR EACH STATEMENT EXECUTE FUNCTION append_only_no_truncate();

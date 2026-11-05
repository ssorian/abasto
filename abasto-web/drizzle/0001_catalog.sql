CREATE TABLE "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"factor" integer NOT NULL,
	"barcode" text,
	"active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "presentations_factor_min" CHECK ("presentations"."factor" >= 1)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"supplier_id" uuid,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "presentations_barcode_unique" ON "presentations" USING btree ("barcode") WHERE "presentations"."barcode" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "presentations_one_default" ON "presentations" USING btree ("product_id") WHERE "presentations"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" USING btree (lower("sku"));--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_unique" ON "suppliers" USING btree (lower("name"));
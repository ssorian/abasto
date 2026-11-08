ALTER TABLE "products" ADD COLUMN "supplier_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "list_price_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fixed_discount_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "promotion_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_amounts_min" CHECK ("products"."list_price_per_piece" >= 0 and "products"."fixed_discount_per_piece" >= 0 and "products"."promotion_per_piece" >= 0);
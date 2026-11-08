ALTER TABLE "products" DROP CONSTRAINT "products_supplier_amounts_min";--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "list_price_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "fixed_discount_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "promotion_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "list_price_per_piece";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_amounts_min" CHECK ("products"."fixed_discount_per_piece" >= 0 and "products"."promotion_per_piece" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_supplier_amounts_min" CHECK ("purchase_lines"."list_price_per_piece" >= 0 and "purchase_lines"."fixed_discount_per_piece" >= 0 and "purchase_lines"."promotion_per_piece" >= 0);--> statement-breakpoint
-- Lines entered directly before box factors were stored kept box_factor = 1. Give them the
-- product's default presentation factor when the quantity is a whole number of those boxes.
UPDATE "purchase_lines" AS line
SET "box_factor" = presentation."factor"
FROM "presentations" AS presentation
WHERE presentation."product_id" = line."product_id"
  AND presentation."is_default" = true
  AND presentation."factor" > 1
  AND line."box_factor" = 1
  AND line."quantity" % presentation."factor" = 0;

ALTER TABLE "products" DROP CONSTRAINT "products_supplier_amounts_min";--> statement-breakpoint
ALTER TABLE "purchase_lines" DROP CONSTRAINT "purchase_lines_supplier_amounts_min";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "list_price_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "list_price_per_piece" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Existing lines keep their stored costs; the list price per piece (ten-thousandths) is the gross
-- cost in cents over the pieces, rounded half up.
UPDATE "purchase_lines"
SET "list_price_per_piece" = round("gross_cost_cents"::numeric * 100 / "quantity")::integer;--> statement-breakpoint
-- Products take the list price of their most recent order line that was not cancelled
-- (purchase date, then creation time, then line id); products never ordered stay at zero.
UPDATE "products"
SET "list_price_per_piece" = latest."list_price_per_piece"
FROM (
  SELECT DISTINCT ON (line."product_id") line."product_id", line."list_price_per_piece"
  FROM "purchase_lines" AS line
  INNER JOIN "purchases" AS purchase ON purchase."id" = line."purchase_id"
  WHERE purchase."status" <> 'Cancelado'
  ORDER BY line."product_id", purchase."purchased_on" DESC, purchase."created_at" DESC, line."id" DESC
) AS latest
WHERE "products"."id" = latest."product_id";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_amounts_min" CHECK ("products"."list_price_per_piece" >= 0 and "products"."fixed_discount_per_piece" >= 0 and "products"."promotion_per_piece" >= 0);--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_supplier_amounts_min" CHECK ("purchase_lines"."gross_cost_cents" >= 0 and "purchase_lines"."list_price_per_piece" >= 0 and "purchase_lines"."fixed_discount_per_piece" >= 0 and "purchase_lines"."promotion_per_piece" >= 0);
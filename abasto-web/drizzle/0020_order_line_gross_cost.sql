ALTER TABLE "purchase_lines" DROP CONSTRAINT "purchase_lines_supplier_amounts_min";--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD COLUMN "gross_cost_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Gross line cost before discounts: from the list price when the line had one, else the net cost
-- plus the discount and promotion of the line (rounded half up once, in cents).
UPDATE "purchase_lines"
SET "gross_cost_cents" = CASE
  WHEN "list_price_per_piece" > 0
    THEN round("list_price_per_piece"::numeric * "quantity" / 100)::integer
  ELSE "total_cost_cents"
    + round("quantity"::numeric * ("fixed_discount_per_piece" + "promotion_per_piece") / 100)::integer
END;--> statement-breakpoint
ALTER TABLE "purchase_lines" DROP COLUMN "list_price_per_piece";--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_supplier_amounts_min" CHECK ("purchase_lines"."gross_cost_cents" >= 0 and "purchase_lines"."fixed_discount_per_piece" >= 0 and "purchase_lines"."promotion_per_piece" >= 0);

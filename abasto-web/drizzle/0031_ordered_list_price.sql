ALTER TABLE "purchase_lines" ADD COLUMN "ordered_list_price_per_piece" integer;--> statement-breakpoint
UPDATE "purchase_lines" SET "ordered_list_price_per_piece" = "list_price_per_piece" WHERE "ordered_list_price_per_piece" IS NULL;

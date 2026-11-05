ALTER TABLE "lots" ALTER COLUMN "received_at" SET DEFAULT clock_timestamp();--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp();--> statement-breakpoint
ALTER TABLE "cash_movements" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp();
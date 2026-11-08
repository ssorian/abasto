DROP TABLE "credit_authorizations";--> statement-breakpoint
DROP TABLE "customer_ledger";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_credit_limit_min";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_terms_days_min";--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN "credit_enabled";--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN "credit_limit_cents";--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN "terms_days";
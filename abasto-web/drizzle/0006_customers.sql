CREATE TABLE "customer_commercial_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"presentation_id" uuid NOT NULL,
	"min_quantity" integer NOT NULL,
	"discount_bps" integer,
	"price_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_rules_min_quantity" CHECK ("customer_commercial_rules"."min_quantity" >= 1),
	CONSTRAINT "customer_rules_one_kind" CHECK (("customer_commercial_rules"."discount_bps" is not null) <> ("customer_commercial_rules"."price_cents" is not null)),
	CONSTRAINT "customer_rules_discount_range" CHECK ("customer_commercial_rules"."discount_bps" is null or "customer_commercial_rules"."discount_bps" between 1 and 10000),
	CONSTRAINT "customer_rules_price_min" CHECK ("customer_commercial_rules"."price_cents" is null or "customer_commercial_rules"."price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"addresses" text[] DEFAULT '{}' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"credit_enabled" boolean DEFAULT false NOT NULL,
	"credit_limit_cents" integer DEFAULT 0 NOT NULL,
	"terms_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_credit_limit_min" CHECK ("customers"."credit_limit_cents" >= 0),
	CONSTRAINT "customers_terms_days_min" CHECK ("customers"."terms_days" >= 0)
);
--> statement-breakpoint
ALTER TABLE "customer_commercial_rules" ADD CONSTRAINT "customer_commercial_rules_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_commercial_rules" ADD CONSTRAINT "customer_commercial_rules_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_commercial_rules_tier_unique" ON "customer_commercial_rules" USING btree ("customer_id","presentation_id","min_quantity");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_name_unique" ON "customers" USING btree (lower("name"));
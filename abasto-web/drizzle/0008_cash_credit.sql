CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"tendered_cents" integer,
	"change_cents" integer,
	"reason" text DEFAULT '' NOT NULL,
	"order_id" uuid,
	"customer_id" uuid,
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movements_type_check" CHECK ("cash_movements"."type" in ('sale', 'abono', 'entry', 'withdrawal')),
	CONSTRAINT "cash_movements_sign" CHECK (("cash_movements"."type" = 'withdrawal' and "cash_movements"."amount_cents" < 0) or ("cash_movements"."type" <> 'withdrawal' and "cash_movements"."amount_cents" > 0))
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"status" text NOT NULL,
	"opening_cents" integer NOT NULL,
	"opened_by" text NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_by" text,
	"closed_at" timestamp,
	"counted_cents" integer,
	"expected_cents" integer,
	"difference_cents" integer,
	CONSTRAINT "cash_sessions_status_check" CHECK ("cash_sessions"."status" in ('open', 'closed')),
	CONSTRAINT "cash_sessions_opening_min" CHECK ("cash_sessions"."opening_cents" >= 0),
	CONSTRAINT "cash_sessions_closed_fields" CHECK (("cash_sessions"."status" = 'open') = ("cash_sessions"."closed_at" is null and "cash_sessions"."counted_cents" is null))
);
--> statement-breakpoint
CREATE TABLE "credit_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"decided_by" text,
	"decided_at" timestamp,
	"used_at" timestamp,
	CONSTRAINT "credit_authorizations_amount_min" CHECK ("credit_authorizations"."amount_cents" > 0),
	CONSTRAINT "credit_authorizations_status_check" CHECK ("credit_authorizations"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "credit_authorizations_decision" CHECK (("credit_authorizations"."status" = 'pending') = ("credit_authorizations"."decided_by" is null and "credit_authorizations"."decided_at" is null))
);
--> statement-breakpoint
CREATE TABLE "customer_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "customer_ledger_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"customer_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"order_id" uuid,
	"due_on" date,
	"cash_movement_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_ledger_amount_min" CHECK ("customer_ledger"."amount_cents" > 0),
	CONSTRAINT "customer_ledger_type_check" CHECK ("customer_ledger"."type" in ('charge', 'abono')),
	CONSTRAINT "customer_ledger_shape" CHECK (("customer_ledger"."type" = 'charge' and "customer_ledger"."order_id" is not null and "customer_ledger"."due_on" is not null) or ("customer_ledger"."type" = 'abono' and "customer_ledger"."cash_movement_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_cash_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_user_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_authorizations" ADD CONSTRAINT "credit_authorizations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_authorizations" ADD CONSTRAINT "credit_authorizations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_authorizations" ADD CONSTRAINT "credit_authorizations_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_cash_movement_id_cash_movements_id_fk" FOREIGN KEY ("cash_movement_id") REFERENCES "public"."cash_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_session_idx" ON "cash_movements" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movements_one_sale_per_order" ON "cash_movements" USING btree ("order_id") WHERE "cash_movements"."type" = 'sale';--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_one_open_per_warehouse" ON "cash_sessions" USING btree ("warehouse_id") WHERE "cash_sessions"."status" = 'open';--> statement-breakpoint
CREATE INDEX "cash_sessions_warehouse_idx" ON "cash_sessions" USING btree ("warehouse_id","opened_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_authorizations_order_amount_unique" ON "credit_authorizations" USING btree ("order_id","amount_cents");--> statement-breakpoint
CREATE INDEX "credit_authorizations_status_idx" ON "credit_authorizations" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "customer_ledger_customer_idx" ON "customer_ledger" USING btree ("customer_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_ledger_one_charge_per_order" ON "customer_ledger" USING btree ("order_id") WHERE "customer_ledger"."type" = 'charge';
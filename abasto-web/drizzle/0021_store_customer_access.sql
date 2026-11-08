ALTER TABLE "user" DROP CONSTRAINT "user_role_check";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" in ('owner', 'staff', 'customer'));
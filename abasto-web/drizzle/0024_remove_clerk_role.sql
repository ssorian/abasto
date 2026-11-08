ALTER TABLE "warehouse_assignments" DROP CONSTRAINT "warehouse_assignments_role_check";--> statement-breakpoint
UPDATE "warehouse_assignments" SET "role" = 'manager' WHERE "role" = 'clerk';--> statement-breakpoint
ALTER TABLE "warehouse_assignments" ADD CONSTRAINT "warehouse_assignments_role_check" CHECK ("warehouse_assignments"."role" in ('manager'));

ALTER TABLE "orders" DROP CONSTRAINT "orders_status_check";--> statement-breakpoint
-- "Preparado" is gone: those orders are simply still reserved.
UPDATE "orders" SET "status" = 'Reservado' WHERE "status" = 'Preparado';--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "prepared_at";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('Reservado', 'Recogido', 'Cancelado', 'Vencido'));

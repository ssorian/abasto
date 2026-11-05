import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '#/db/auth-schema'
import { products } from '#/modules/catalog/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const transferStatuses = [
  'En tránsito',
  'Recibido',
  'Recibido con diferencia',
  'Cancelado',
] as const
export type TransferStatus = (typeof transferStatuses)[number]

export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromWarehouseId: uuid('from_warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    toWarehouseId: uuid('to_warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    status: text('status', { enum: transferStatuses }).notNull(),
    notes: text('notes').notNull().default(''),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** Who received or cancelled it, and when. */
    closedBy: text('closed_by').references(() => user.id),
    closedAt: timestamp('closed_at'),
  },
  (table) => [
    check(
      'transfers_distinct_warehouses',
      sql`${table.fromWarehouseId} <> ${table.toWarehouseId}`,
    ),
    check(
      'transfers_status_check',
      sql`${table.status} in ('En tránsito', 'Recibido', 'Recibido con diferencia', 'Cancelado')`,
    ),
    index('transfers_from_idx').on(table.fromWarehouseId),
    index('transfers_to_idx').on(table.toWarehouseId),
  ],
)

/** One line per source lot the dispatch took units from. */
export const transferLines = pgTable(
  'transfer_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transferId: uuid('transfer_id')
      .notNull()
      .references(() => transfers.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sourceLotId: uuid('source_lot_id')
      .notNull()
      .references(() => lots.id),
    /** Base units sent. */
    quantity: integer('quantity').notNull(),
    /** Base units received; null while in transit. */
    receivedQuantity: integer('received_quantity'),
    /** Lot created at the destination (none when nothing arrived). */
    destinationLotId: uuid('destination_lot_id').references(() => lots.id),
  },
  (table) => [
    check('transfer_lines_quantity_min', sql`${table.quantity} > 0`),
    check(
      'transfer_lines_received_range',
      sql`${table.receivedQuantity} is null or (${table.receivedQuantity} >= 0 and ${table.receivedQuantity} <= ${table.quantity})`,
    ),
    index('transfer_lines_transfer_idx').on(table.transferId),
  ],
)

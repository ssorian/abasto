import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { user } from '#/db/auth-schema'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const lossCategories = ['caducado', 'dañado', 'otro'] as const
export type LossCategory = (typeof lossCategories)[number]

export const movementTypes = [
  'purchase',
  'adjustment',
  'loss',
  'count',
  'sale',
  'transfer_out',
  'transfer_in',
  'transfer_return',
] as const
export type MovementType = (typeof movementTypes)[number]

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  reference: text('reference').notNull().default(''),
  purchasedOn: date('purchased_on', { mode: 'string' }).notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const purchaseLines = pgTable(
  'purchase_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    /** Base units. */
    quantity: integer('quantity').notNull(),
    /** Whole line cost in integer cents; unit cost is derived, never stored rounded. */
    totalCostCents: integer('total_cost_cents').notNull(),
    lotCode: text('lot_code').notNull().default(''),
    expiresOn: date('expires_on', { mode: 'string' }),
  },
  (table) => [
    check('purchase_lines_quantity_min', sql`${table.quantity} > 0`),
    check('purchase_lines_cost_min', sql`${table.totalCostCents} >= 0`),
  ],
)

export const lots = pgTable(
  'lots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    /** Null for lots that do not come from a purchase (transfers). */
    purchaseLineId: uuid('purchase_line_id').references(() => purchaseLines.id),
    /** Lot this one was split from when it arrived by transfer. */
    sourceLotId: uuid('source_lot_id').references((): AnyPgColumn => lots.id),
    code: text('code').notNull().default(''),
    expiresOn: date('expires_on', { mode: 'string' }),
    receivedAt: timestamp('received_at')
      .default(sql`clock_timestamp()`)
      .notNull(),
    receivedQuantity: integer('received_quantity').notNull(),
    receivedCostCents: integer('received_cost_cents').notNull(),
    /**
     * Sale price per default presentation (box) in integer cents, never below
     * the lot's cost per box. Null sells at the warehouse standard price.
     */
    salePriceCents: integer('sale_price_cents'),
    /** Cached sum of the lot's ledger movements; updated in the movement's transaction. */
    onHand: integer('on_hand').notNull(),
    /** Cached units held by open orders; never above `on_hand`. Available = on_hand − reserved. */
    reserved: integer('reserved').notNull().default(0),
  },
  (table) => [
    check('lots_on_hand_min', sql`${table.onHand} >= 0`),
    check(
      'lots_reserved_range',
      sql`${table.reserved} >= 0 and ${table.reserved} <= ${table.onHand}`,
    ),
    check('lots_received_quantity_min', sql`${table.receivedQuantity} > 0`),
    check(
      'lots_sale_price_min',
      sql`${table.salePriceCents} is null or ${table.salePriceCents} > 0`,
    ),
    index('lots_product_warehouse_idx').on(table.productId, table.warehouseId),
  ],
)

/** Append-only ledger: a database trigger rejects UPDATE and DELETE. */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => lots.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    type: text('type', { enum: movementTypes }).notNull(),
    /** Signed base units. */
    quantity: integer('quantity').notNull(),
    reason: text('reason').notNull().default(''),
    /** Id of the purchase or physical count that caused the movement. */
    reference: text('reference'),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at')
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    check('stock_movements_quantity_nonzero', sql`${table.quantity} <> 0`),
    check(
      'stock_movements_type_check',
      sql`${table.type} in ('purchase', 'adjustment', 'loss', 'count', 'sale', 'transfer_out', 'transfer_in', 'transfer_return')`,
    ),
    index('stock_movements_lot_idx').on(table.lotId),
  ],
)

export const stockCounts = pgTable('stock_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  expectedQuantity: integer('expected_quantity').notNull(),
  countedQuantity: integer('counted_quantity').notNull(),
  note: text('note').notNull().default(''),
  actorId: text('actor_id')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const stockMinimums = pgTable(
  'stock_minimums',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    minimum: integer('minimum').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.warehouseId] }),
    check('stock_minimums_minimum_min', sql`${table.minimum} >= 0`),
  ],
)

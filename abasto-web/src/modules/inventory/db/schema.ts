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

export const purchaseStatuses = ['Pedido', 'Recibido', 'Cancelado'] as const
export type PurchaseStatus = (typeof purchaseStatuses)[number]

export const pendingTypes = [
  'damaged',
  'missing',
  'replaced',
  'written_off',
] as const
export type PendingType = (typeof pendingTypes)[number]

/**
 * A supplier order: `Pedido` waits in the queue (no stock moved), `Recibido`
 * was verified and its lots exist, `Cancelado` never moved stock. Purchases
 * recorded before orders existed are `Recibido`.
 */
export const purchases = pgTable(
  'purchases',
  {
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
    status: text('status', { enum: purchaseStatuses })
      .notNull()
      .default('Pedido'),
    /** YYYY-MM-DD the supplier is expected to deliver. */
    expectedOn: date('expected_on', { mode: 'string' }),
    receivedAt: timestamp('received_at'),
    receivedBy: text('received_by').references(() => user.id),
  },
  (table) => [
    check(
      'purchases_status_check',
      sql`${table.status} in ('Pedido', 'Recibido', 'Cancelado')`,
    ),
    check(
      'purchases_reception_consistent',
      sql`(${table.status} = 'Recibido' and ${table.receivedAt} is not null and ${table.receivedBy} is not null) or (${table.status} <> 'Recibido' and ${table.receivedAt} is null and ${table.receivedBy} is null)`,
    ),
  ],
)

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
    /** Ordered base units. */
    quantity: integer('quantity').notNull(),
    /**
     * Cost typed in the order line, in integer cents before the fixed discount
     * and promotion. The discount and promotion are the product's, copied per
     * piece (ten-thousandths of a peso) when the order was made; the net line
     * cost (total_cost_cents) = gross − pieces × (discount + promotion).
     */
    grossCostCents: integer('gross_cost_cents').notNull().default(0),
    fixedDiscountPerPiece: integer('fixed_discount_per_piece')
      .notNull()
      .default(0),
    promotionPerPiece: integer('promotion_per_piece').notNull().default(0),
    /** Whole ordered line cost in integer cents; unit cost is derived, never stored rounded. */
    totalCostCents: integer('total_cost_cents').notNull(),
    /** Base units per box when the line was created; boxes = quantity / boxFactor. */
    boxFactor: integer('box_factor').notNull().default(1),
    /** Base units that arrived in good condition; null until received. */
    goodQuantity: integer('good_quantity'),
    /** Base units that arrived damaged or expired; null until received. */
    damagedQuantity: integer('damaged_quantity'),
    lotCode: text('lot_code').notNull().default(''),
    expiresOn: date('expires_on', { mode: 'string' }),
  },
  (table) => [
    check('purchase_lines_quantity_min', sql`${table.quantity} > 0`),
    check('purchase_lines_cost_min', sql`${table.totalCostCents} >= 0`),
    check('purchase_lines_box_factor_min', sql`${table.boxFactor} > 0`),
    check(
      'purchase_lines_supplier_amounts_min',
      sql`${table.grossCostCents} >= 0 and ${table.fixedDiscountPerPiece} >= 0 and ${table.promotionPerPiece} >= 0`,
    ),
    check(
      'purchase_lines_reception_range',
      sql`(${table.goodQuantity} is null and ${table.damagedQuantity} is null) or (${table.goodQuantity} >= 0 and ${table.damagedQuantity} >= 0 and ${table.goodQuantity} + ${table.damagedQuantity} <= ${table.quantity})`,
    ),
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

/**
 * Append-only supplier balance: boxes the supplier owes us (positive: damaged
 * or missing on reception) and boxes settled (negative: replaced by a later
 * delivery or written off "a lo chino"). A database trigger rejects UPDATE and DELETE.
 */
export const supplierPendings = pgTable(
  'supplier_pendings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    /** Order that caused the entry; null for write-offs. */
    purchaseId: uuid('purchase_id').references(() => purchases.id),
    type: text('type', { enum: pendingTypes }).notNull(),
    /** Signed base units: positive owed, negative settled. */
    quantity: integer('quantity').notNull(),
    /** Signed value in cents at the original cost; same sign as `quantity`. */
    valueCents: integer('value_cents').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at')
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    check(
      'supplier_pendings_type_check',
      sql`${table.type} in ('damaged', 'missing', 'replaced', 'written_off')`,
    ),
    check(
      'supplier_pendings_sign',
      sql`(${table.type} in ('damaged', 'missing') and ${table.quantity} > 0 and ${table.valueCents} >= 0) or (${table.type} in ('replaced', 'written_off') and ${table.quantity} < 0 and ${table.valueCents} <= 0)`,
    ),
    index('supplier_pendings_supplier_product_idx').on(
      table.supplierId,
      table.productId,
    ),
  ],
)

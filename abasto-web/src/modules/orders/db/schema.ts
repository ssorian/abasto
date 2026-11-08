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
import { presentations, products } from '#/modules/catalog/db/schema'
import { customers } from '#/modules/customers/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const orderStatuses = [
  'Reservado',
  'Preparado',
  'Recogido',
  'Cancelado',
  'Vencido',
] as const
export type OrderStatus = (typeof orderStatuses)[number]

/** Where an order was placed: at the counter by staff or in the online store. */
export const orderSources = ['counter', 'store'] as const
export type OrderSource = (typeof orderSources)[number]

/** Single-row table (id = 1) with the owner's order settings. */
export const orderSettings = pgTable(
  'order_settings',
  {
    id: integer('id').primaryKey().default(1),
    /** How long an order holds its stock before it expires. */
    reservationHours: integer('reservation_hours').notNull().default(24),
    updatedBy: text('updated_by').references(() => user.id),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('order_settings_single_row', sql`${table.id} = 1`),
    check(
      'order_settings_hours_range',
      sql`${table.reservationHours} between 1 and 720`,
    ),
  ],
)

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    status: text('status', { enum: orderStatuses }).notNull(),
    source: text('source', { enum: orderSources }).notNull().default('counter'),
    notes: text('notes').notNull().default(''),
    /** Sum of the frozen line totals, integer cents. */
    totalCents: integer('total_cents').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    preparedAt: timestamp('prepared_at'),
    /** When the order was picked up, cancelled or expired. */
    closedAt: timestamp('closed_at'),
  },
  (table) => [
    check('orders_total_min', sql`${table.totalCents} > 0`),
    check(
      'orders_status_check',
      sql`${table.status} in ('Reservado', 'Preparado', 'Recogido', 'Cancelado', 'Vencido')`,
    ),
    check('orders_source_check', sql`${table.source} in ('counter', 'store')`),
    index('orders_warehouse_status_idx').on(
      table.warehouseId,
      table.status,
      table.expiresAt,
    ),
  ],
)

export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    presentationId: uuid('presentation_id')
      .notNull()
      .references(() => presentations.id),
    /** Quantity in the presentation. */
    quantity: integer('quantity').notNull(),
    /** Same quantity in base units (quantity × factor). */
    baseQuantity: integer('base_quantity').notNull(),
    /** Warehouse list price when the order was placed. */
    listPriceCents: integer('list_price_cents').notNull(),
    /** Snapshot of the commercial rule that applied, if any. */
    ruleMinQuantity: integer('rule_min_quantity'),
    ruleDiscountBps: integer('rule_discount_bps'),
    rulePriceCents: integer('rule_price_cents'),
    /** Frozen price per presentation after the rule. */
    unitPriceCents: integer('unit_price_cents').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [
    check('order_lines_quantity_min', sql`${table.quantity} > 0`),
    check('order_lines_base_quantity_min', sql`${table.baseQuantity} > 0`),
    check('order_lines_unit_price_min', sql`${table.unitPriceCents} > 0`),
    index('order_lines_order_idx').on(table.orderId),
  ],
)

/** Lot units held (and later sold) by one order line. */
export const orderAllocations = pgTable(
  'order_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderLineId: uuid('order_line_id')
      .notNull()
      .references(() => orderLines.id),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => lots.id),
    /** Base units. */
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    check('order_allocations_quantity_min', sql`${table.quantity} > 0`),
    index('order_allocations_line_idx').on(table.orderLineId),
    index('order_allocations_lot_idx').on(table.lotId),
  ],
)

import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '#/db/auth-schema'
import { customers } from '#/modules/customers/db/schema'
import { orders } from '#/modules/orders/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const cashSessionStatuses = ['open', 'closed'] as const
export type CashSessionStatus = (typeof cashSessionStatuses)[number]

/** One cash drawer shift of a warehouse; a partial unique index allows one open per warehouse. */
export const cashSessions = pgTable(
  'cash_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    status: text('status', { enum: cashSessionStatuses }).notNull(),
    /** Integer cents counted into the drawer when it opened. */
    openingCents: integer('opening_cents').notNull(),
    openedBy: text('opened_by')
      .notNull()
      .references(() => user.id),
    openedAt: timestamp('opened_at').defaultNow().notNull(),
    closedBy: text('closed_by').references(() => user.id),
    closedAt: timestamp('closed_at'),
    countedCents: integer('counted_cents'),
    /** Opening + movements, stored at close. */
    expectedCents: integer('expected_cents'),
    /** Counted − expected (negative = missing cash), stored at close. */
    differenceCents: integer('difference_cents'),
  },
  (table) => [
    uniqueIndex('cash_sessions_one_open_per_warehouse')
      .on(table.warehouseId)
      .where(sql`${table.status} = 'open'`),
    index('cash_sessions_warehouse_idx').on(table.warehouseId, table.openedAt),
    check(
      'cash_sessions_status_check',
      sql`${table.status} in ('open', 'closed')`,
    ),
    check('cash_sessions_opening_min', sql`${table.openingCents} >= 0`),
    check(
      'cash_sessions_closed_fields',
      sql`(${table.status} = 'open') = (${table.closedAt} is null and ${table.countedCents} is null)`,
    ),
  ],
)

// 'abono' is kept for legacy immutable rows; nothing creates it anymore.
// 'rider_difference' is the cash a rider handed in minus the value of the
// delivery sold (negative: Faltante de reparto, positive: Sobrante de reparto).
export const cashMovementTypes = [
  'sale',
  'abono',
  'entry',
  'withdrawal',
  'rider_difference',
] as const
export type CashMovementType = (typeof cashMovementTypes)[number]

/** Append-only drawer ledger: database triggers reject UPDATE, DELETE and TRUNCATE. */
export const cashMovements = pgTable(
  'cash_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => cashSessions.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    type: text('type', { enum: cashMovementTypes }).notNull(),
    /** Signed cents that stay in the drawer: positive in, negative out. */
    amountCents: integer('amount_cents').notNull(),
    /** Cash handed over and change given back (sales only). */
    tenderedCents: integer('tendered_cents'),
    changeCents: integer('change_cents'),
    reason: text('reason').notNull().default(''),
    orderId: uuid('order_id').references(() => orders.id),
    customerId: uuid('customer_id').references(() => customers.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at')
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    index('cash_movements_session_idx').on(table.sessionId, table.createdAt),
    uniqueIndex('cash_movements_one_sale_per_order')
      .on(table.orderId)
      .where(sql`${table.type} = 'sale'`),
    check(
      'cash_movements_type_check',
      sql`${table.type} in ('sale', 'abono', 'entry', 'withdrawal', 'rider_difference')`,
    ),
    check(
      'cash_movements_sign',
      sql`(${table.type} = 'withdrawal' and ${table.amountCents} < 0) or (${table.type} = 'rider_difference' and ${table.amountCents} <> 0) or (${table.type} not in ('withdrawal', 'rider_difference') and ${table.amountCents} > 0)`,
    ),
  ],
)

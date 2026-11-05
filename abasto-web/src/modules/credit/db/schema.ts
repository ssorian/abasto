import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '#/db/auth-schema'
import { cashMovements } from '#/modules/cash/db/schema'
import { customers } from '#/modules/customers/db/schema'
import { orders } from '#/modules/orders/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const creditAuthorizationStatuses = [
  'pending',
  'approved',
  'rejected',
] as const
export type CreditAuthorizationStatus =
  (typeof creditAuthorizationStatuses)[number]

/**
 * Owner decision to let one order go on credit past the limit or an overdue
 * balance. Bound to the order and its amount: another amount needs another row.
 */
export const creditAuthorizations = pgTable(
  'credit_authorizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    amountCents: integer('amount_cents').notNull(),
    status: text('status', { enum: creditAuthorizationStatuses }).notNull(),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    decidedBy: text('decided_by').references(() => user.id),
    decidedAt: timestamp('decided_at'),
    /** Set when the pickup that used the approval went through. */
    usedAt: timestamp('used_at'),
  },
  (table) => [
    uniqueIndex('credit_authorizations_order_amount_unique').on(
      table.orderId,
      table.amountCents,
    ),
    index('credit_authorizations_status_idx').on(
      table.status,
      table.requestedAt,
    ),
    check('credit_authorizations_amount_min', sql`${table.amountCents} > 0`),
    check(
      'credit_authorizations_status_check',
      sql`${table.status} in ('pending', 'approved', 'rejected')`,
    ),
    check(
      'credit_authorizations_decision',
      sql`(${table.status} = 'pending') = (${table.decidedBy} is null and ${table.decidedAt} is null)`,
    ),
  ],
)

export const customerEntryTypes = ['charge', 'abono'] as const
export type CustomerEntryType = (typeof customerEntryTypes)[number]

/**
 * Append-only customer balance ledger (database triggers reject UPDATE,
 * DELETE and TRUNCATE). Balance = charges − abonos; amounts are always positive.
 */
export const customerLedger = pgTable(
  'customer_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Insertion order; makes "oldest first" deterministic. */
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    type: text('type', { enum: customerEntryTypes }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    /** Charges: the picked-up order and its due date (business calendar day). */
    orderId: uuid('order_id').references(() => orders.id),
    dueOn: date('due_on', { mode: 'string' }),
    /** Abonos: the drawer movement that received the cash. */
    cashMovementId: uuid('cash_movement_id').references(() => cashMovements.id),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('customer_ledger_customer_idx').on(table.customerId, table.seq),
    uniqueIndex('customer_ledger_one_charge_per_order')
      .on(table.orderId)
      .where(sql`${table.type} = 'charge'`),
    check('customer_ledger_amount_min', sql`${table.amountCents} > 0`),
    check(
      'customer_ledger_type_check',
      sql`${table.type} in ('charge', 'abono')`,
    ),
    check(
      'customer_ledger_shape',
      sql`(${table.type} = 'charge' and ${table.orderId} is not null and ${table.dueOn} is not null) or (${table.type} = 'abono' and ${table.cashMovementId} is not null)`,
    ),
  ],
)

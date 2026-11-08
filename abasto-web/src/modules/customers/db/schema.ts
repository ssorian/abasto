import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '#/db/auth-schema'
import { presentations } from '#/modules/catalog/db/schema'

/** Company-wide customers (authorized distributors); one credit balance each. */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    contact: text('contact').notNull().default(''),
    phone: text('phone').notNull().default(''),
    addresses: text('addresses')
      .array()
      .notNull()
      .default(sql`'{}'`),
    notes: text('notes').notNull().default(''),
    active: boolean('active').notNull().default(true),
    creditEnabled: boolean('credit_enabled').notNull().default(false),
    /** Integer cents. */
    creditLimitCents: integer('credit_limit_cents').notNull().default(0),
    termsDays: integer('terms_days').notNull().default(0),
    /** Store sign-in account (role `customer`) the owner created, if any. */
    userId: text('user_id')
      .unique('customers_user_id_unique')
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('customers_name_unique').on(sql`lower(${table.name})`),
    check('customers_credit_limit_min', sql`${table.creditLimitCents} >= 0`),
    check('customers_terms_days_min', sql`${table.termsDays} >= 0`),
  ],
)

/**
 * Commercial rule per (customer, presentation): from `minQuantity` presentations,
 * either a discount in basis points or a fixed unit price in cents.
 */
export const customerCommercialRules = pgTable(
  'customer_commercial_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    presentationId: uuid('presentation_id')
      .notNull()
      .references(() => presentations.id),
    minQuantity: integer('min_quantity').notNull(),
    discountBps: integer('discount_bps'),
    priceCents: integer('price_cents'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('customer_commercial_rules_tier_unique').on(
      table.customerId,
      table.presentationId,
      table.minQuantity,
    ),
    check('customer_rules_min_quantity', sql`${table.minQuantity} >= 1`),
    check(
      'customer_rules_one_kind',
      sql`(${table.discountBps} is not null) <> (${table.priceCents} is not null)`,
    ),
    check(
      'customer_rules_discount_range',
      sql`${table.discountBps} is null or ${table.discountBps} between 1 and 10000`,
    ),
    check(
      'customer_rules_price_min',
      sql`${table.priceCents} is null or ${table.priceCents} > 0`,
    ),
  ],
)

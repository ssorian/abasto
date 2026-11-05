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
import { warehouses } from '#/modules/warehouses/db/schema'

export const priceSources = ['manual', 'bulk', 'purchase-suggestion'] as const
export type PriceSource = (typeof priceSources)[number]

/** Append-only price history: a database trigger rejects UPDATE and DELETE. */
export const presentationPrices = pgTable(
  'presentation_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    presentationId: uuid('presentation_id')
      .notNull()
      .references(() => presentations.id),
    /** Integer cents, always above zero. */
    priceCents: integer('price_cents').notNull(),
    // clock_timestamp(), not now(): now() is the transaction start, so a change
    // that waited for a lock would be dated before prices saved meanwhile.
    effectiveFrom: timestamp('effective_from')
      .default(sql`clock_timestamp()`)
      .notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    reason: text('reason').notNull().default(''),
    source: text('source', { enum: priceSources }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    check('presentation_prices_price_min', sql`${table.priceCents} > 0`),
    check(
      'presentation_prices_source_check',
      sql`${table.source} in ('manual', 'bulk', 'purchase-suggestion')`,
    ),
    index('presentation_prices_current_idx').on(
      table.warehouseId,
      table.presentationId,
      table.effectiveFrom,
    ),
  ],
)

/** Target margin per product, in basis points (1200 = 12%); owned by pricing, set by the owner. */
export const productMargins = pgTable(
  'product_margins',
  {
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id),
    marginBps: integer('margin_bps').notNull(),
  },
  (table) => [check('product_margins_bps_min', sql`${table.marginBps} >= 0`)],
)

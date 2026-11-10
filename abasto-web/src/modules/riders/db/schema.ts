import { sql } from 'drizzle-orm'
import {
  boolean,
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
import { products } from '#/modules/catalog/db/schema'
import { cashMovements } from '#/modules/cash/db/schema'
import { lots } from '#/modules/inventory/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const assignmentStatuses = ['En ruta', 'Liquidada', 'Cancelada'] as const
export type AssignmentStatus = (typeof assignmentStatuses)[number]

/** A delivery rider of one warehouse: a plain catalog entry, not a user or customer. */
export const riders = pgTable(
  'riders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    name: text('name').notNull(),
    active: boolean('active').notNull().default(true),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    check('riders_name_not_blank', sql`length(btrim(${table.name})) > 0`),
    uniqueIndex('riders_warehouse_name_unique').on(
      table.warehouseId,
      sql`lower(${table.name})`,
    ),
  ],
)

/** Stock handed to a rider for the day; settled (or cancelled) exactly once. */
export const riderAssignments = pgTable(
  'rider_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id),
    status: text('status', { enum: assignmentStatuses }).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** Who settled or cancelled it, and when. */
    closedBy: text('closed_by').references(() => user.id),
    closedAt: timestamp('closed_at'),
    /** Value of the sold units at the frozen prices; set at settlement. */
    expectedCents: integer('expected_cents'),
    /** Cash the rider handed in; set at settlement. */
    deliveredCents: integer('delivered_cents'),
    /** Delivered − expected: negative is a shortage, positive a surplus. */
    differenceCents: integer('difference_cents'),
    /** The `sale` drawer movement with the cash handed in (none when nothing was handed in). */
    cashMovementId: uuid('cash_movement_id').references(() => cashMovements.id),
  },
  (table) => [
    check(
      'rider_assignments_status_check',
      sql`${table.status} in ('En ruta', 'Liquidada', 'Cancelada')`,
    ),
    check(
      'rider_assignments_closing_consistent',
      sql`(${table.status} = 'En ruta') = (${table.closedAt} is null and ${table.closedBy} is null)`,
    ),
    check(
      'rider_assignments_settlement_consistent',
      sql`(${table.status} = 'Liquidada') = (${table.expectedCents} is not null and ${table.deliveredCents} is not null and ${table.differenceCents} is not null)`,
    ),
    check(
      'rider_assignments_amounts_min',
      sql`(${table.expectedCents} is null or ${table.expectedCents} >= 0) and (${table.deliveredCents} is null or ${table.deliveredCents} >= 0)`,
    ),
    uniqueIndex('rider_assignments_one_open_per_rider')
      .on(table.riderId)
      .where(sql`${table.status} = 'En ruta'`),
    index('rider_assignments_warehouse_idx').on(
      table.warehouseId,
      table.status,
      table.createdAt,
    ),
  ],
)

export const riderAssignmentLines = pgTable(
  'rider_assignment_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => riderAssignments.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    /** Units per box when assigned; boxes = assigned / boxFactor for display. */
    boxFactor: integer('box_factor').notNull(),
    /** Base units handed out. */
    assignedQuantity: integer('assigned_quantity').notNull(),
    /** Base units that came back; null until settled. */
    leftoverQuantity: integer('leftover_quantity'),
  },
  (table) => [
    check('rider_lines_assigned_min', sql`${table.assignedQuantity} > 0`),
    check('rider_lines_box_factor_min', sql`${table.boxFactor} > 0`),
    check(
      'rider_lines_leftover_range',
      sql`${table.leftoverQuantity} is null or (${table.leftoverQuantity} >= 0 and ${table.leftoverQuantity} <= ${table.assignedQuantity})`,
    ),
    index('rider_lines_assignment_idx').on(table.assignmentId),
  ],
)

/** Lot units held by one line, with the price frozen when they were assigned. */
export const riderAllocations = pgTable(
  'rider_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineId: uuid('line_id')
      .notNull()
      .references(() => riderAssignmentLines.id),
    lotId: uuid('lot_id')
      .notNull()
      .references(() => lots.id),
    /** Base units reserved from the lot. */
    quantity: integer('quantity').notNull(),
    /** Frozen sale price of one default presentation (box) of this lot. */
    priceCents: integer('price_cents').notNull(),
    /** Base units in that default presentation. */
    priceFactor: integer('price_factor').notNull(),
    /** Units given back to the lot; null until settled. */
    leftoverQuantity: integer('leftover_quantity'),
    /** Units sold (quantity − leftover); null until settled. */
    soldQuantity: integer('sold_quantity'),
  },
  (table) => [
    check('rider_allocations_quantity_min', sql`${table.quantity} > 0`),
    check('rider_allocations_price_min', sql`${table.priceCents} > 0`),
    check('rider_allocations_factor_min', sql`${table.priceFactor} > 0`),
    check(
      'rider_allocations_settlement_range',
      sql`(${table.leftoverQuantity} is null and ${table.soldQuantity} is null) or (${table.leftoverQuantity} >= 0 and ${table.soldQuantity} >= 0 and ${table.leftoverQuantity} + ${table.soldQuantity} = ${table.quantity})`,
    ),
    index('rider_allocations_line_idx').on(table.lineId),
    index('rider_allocations_lot_idx').on(table.lotId),
  ],
)

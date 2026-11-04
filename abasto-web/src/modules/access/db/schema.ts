import { sql } from 'drizzle-orm'
import {
  check,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '#/db/auth-schema'
import { warehouses } from '#/modules/warehouses/db/schema'

export const warehouseRoles = ['manager', 'clerk'] as const
export type WarehouseRole = (typeof warehouseRoles)[number]

/** Which warehouses a staff user operates, and with which role. */
export const warehouseAssignments = pgTable(
  'warehouse_assignments',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    role: text('role', { enum: warehouseRoles }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.warehouseId] }),
    check(
      'warehouse_assignments_role_check',
      sql`${table.role} in ('manager', 'clerk')`,
    ),
  ],
)

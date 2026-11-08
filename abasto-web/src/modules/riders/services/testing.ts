/** Shared fixtures for rider service tests. */
import { asc, count } from 'drizzle-orm'
import { db } from '#/db'
import type { Actor } from '#/modules/access/lib/policy'
import { cashMovements } from '#/modules/cash/db/schema'
import {
  errorOf,
  orderState,
  receive,
  setupOrders,
} from '#/modules/orders/services/testing'
import {
  riderAllocations,
  riderAssignmentLines,
  riderAssignments,
  riders,
} from '#/modules/riders/db/schema'
import { createRider } from '#/modules/riders/services/riders'

export { errorOf, receive }

/** Orders fixture (piece price 1000, box of 12, open drawer in A) plus riders. */
export async function setupRiders() {
  const fx = await setupOrders()
  const rider = await createRider(fx.managerA, {
    warehouseId: fx.a.id,
    name: 'Luis',
  })
  const other = await createRider(fx.managerA, {
    warehouseId: fx.a.id,
    name: 'Marta',
  })
  const customerActor: Actor = {
    userId: 'user-cliente',
    role: 'customer',
    assignments: new Map(),
  }
  return { ...fx, rider, other, customerActor }
}
export type RidersFixture = Awaited<ReturnType<typeof setupRiders>>

/** Everything a rejected rider operation must leave untouched. */
export async function riderState() {
  return {
    ...(await orderState()),
    riders: await db.select().from(riders).orderBy(asc(riders.id)),
    riderAssignments: await db
      .select()
      .from(riderAssignments)
      .orderBy(asc(riderAssignments.id)),
    riderLines: await db
      .select()
      .from(riderAssignmentLines)
      .orderBy(asc(riderAssignmentLines.id)),
    riderAllocations: await db
      .select()
      .from(riderAllocations)
      .orderBy(asc(riderAllocations.id)),
    cashMovements: (await db.select({ value: count() }).from(cashMovements))[0]
      ?.value,
  }
}

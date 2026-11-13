/** Shared fixtures for orders service tests. */
import { asc, count } from 'drizzle-orm'
import { db } from '#/db'
import { openCashSession } from '#/modules/cash/services/cash-sessions'
import { createCustomer } from '#/modules/customers/services/customers'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import {
  orderAllocations,
  orderLines,
  orders,
} from '#/modules/orders/db/schema'
import { setPrices } from '#/modules/pricing/services/prices'
import { setupPricing } from '#/modules/pricing/services/testing'
import { useClock } from '#/modules/orders/services/clock'

export { errorOf, receive } from '#/modules/pricing/services/testing'
export { useClock }

/** Cash tendered that covers any test order. */
export const payCash = {
  terms: 'contado' as const,
  tenderedCents: 100_000_000,
}

/**
 * Pricing fixture plus a customer, own prices in warehouse A (piece 1000,
 * box 12000), and an open cash drawer there (opening 0).
 */
export async function setupOrders() {
  const fx = await setupPricing()
  const customer = await createCustomer(fx.owner, {
    name: 'Distribuidora Norte',
  })
  const piece = fx.piece(fx.milkBox).id
  const box = fx.box(fx.milkBox).id
  await setPrices(fx.owner, {
    warehouseId: fx.a.id,
    prices: [
      { presentationId: piece, priceCents: 1000 },
      { presentationId: box, priceCents: 12000 },
    ],
  })
  await openCashSession(fx.staffA, { warehouseId: fx.a.id, openingCents: 0 })
  return { ...fx, customer, pieceId: piece, boxId: box }
}

export type OrdersFixture = Awaited<ReturnType<typeof setupOrders>>

const countOf = async (
  table:
    | typeof orders
    | typeof orderLines
    | typeof orderAllocations
    | typeof stockMovements,
) => (await db.select({ value: count() }).from(table))[0]?.value

/** Everything a rejected order operation must leave untouched. */
export async function orderState() {
  return {
    orders: await db.select().from(orders).orderBy(asc(orders.id)),
    lines: await countOf(orderLines),
    allocations: await countOf(orderAllocations),
    movements: await countOf(stockMovements),
    lots: await db
      .select({ id: lots.id, onHand: lots.onHand, reserved: lots.reserved })
      .from(lots)
      .orderBy(asc(lots.id)),
  }
}

export const HOUR = 3_600_000
/** Moves the services' clock forward from now. */
export const advance = (hours: number) =>
  useClock(() => new Date(Date.now() + hours * HOUR))

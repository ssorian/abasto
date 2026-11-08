/** Shared fixtures for cash and pickup payment tests. */
import { asc, count } from 'drizzle-orm'
import { db } from '#/db'
import { cashMovements, cashSessions } from '#/modules/cash/db/schema'
import { createOrder } from '#/modules/orders/services/orders'
import {
  orderState,
  receive,
  setupOrders,
} from '#/modules/orders/services/testing'

export {
  advance,
  errorOf,
  orderState,
  payCash,
  receive,
  useClock,
} from '#/modules/orders/services/testing'

/** Piece price 1000 cents; 100 pieces in A; `place` reserves an order of pieces. */
export async function setupSales() {
  const fx = await setupOrders()
  await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
  const place = (
    quantity: number,
    options: { warehouseId?: string; customerId?: string } = {},
  ) =>
    createOrder(options.warehouseId === fx.b.id ? fx.managerB : fx.clerkA, {
      warehouseId: options.warehouseId ?? fx.a.id,
      customerId: options.customerId ?? fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity }],
    })
  return { ...fx, place }
}

/** Everything a rejected cash operation must leave untouched. */
export async function paymentState() {
  return {
    ...(await orderState()),
    sessions: await db
      .select()
      .from(cashSessions)
      .orderBy(asc(cashSessions.id)),
    cashMovements: (await db.select({ value: count() }).from(cashMovements))[0]
      ?.value,
  }
}

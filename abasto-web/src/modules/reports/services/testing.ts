/** Shared fixtures for reports and overview tests. */
import { openCashSession } from '#/modules/cash/services/cash-sessions'
import type { Actor } from '#/modules/access/lib/policy'
import {
  payCash,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import { createOrder } from '#/modules/orders/services/orders'
import { setPrices } from '#/modules/pricing/services/prices'

export { errorOf, receive } from '#/modules/orders/services/testing'
export { useClock }

/** Far-future expiry so lots never expire during a test. */
export const farFuture = '2099-01-01'

/**
 * Orders fixture plus a priced warehouse B with an open drawer. Piece price is
 * 1000 cents in both warehouses; `sell` places and picks up a cash order with
 * the services' clock set to `at` (an ISO instant).
 */
export async function setupReports() {
  const fx = await setupOrders()
  await setPrices(fx.owner, {
    warehouseId: fx.b.id,
    prices: [{ presentationId: fx.pieceId, priceCents: 1000 }],
  })
  await openCashSession(fx.managerB, { warehouseId: fx.b.id, openingCents: 0 })
  const sell = async (input: {
    at: string
    quantity: number
    customerId?: string
    warehouseId?: string
  }) => {
    useClock(() => new Date(input.at))
    const inB = input.warehouseId === fx.b.id
    const actor: Actor = inB ? fx.managerB : fx.staffA
    const order = await createOrder(actor, {
      warehouseId: input.warehouseId ?? fx.a.id,
      customerId: input.customerId ?? fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: input.quantity }],
    })
    return pickupOrder(actor, order.id, payCash)
  }
  return { ...fx, sell }
}

export type ReportsFixture = Awaited<ReturnType<typeof setupReports>>

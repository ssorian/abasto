import { findCustomer } from '#/shared/demo/customers'
import { demoStock } from '#/shared/demo/inventory'
import { demoPendingOrders } from '#/shared/demo/orders'
import { quoteLine, reserveLine } from '#/modules/counter/lib/quote'
import {
  defaultPresentation,
  requireProduct,
  stockKey,
} from '#/modules/counter/lib/stock'

import type {
  CartLine,
  CounterState,
  Order,
} from '#/modules/counter/types/counter'

/** Splits seeded base units into whole bulk presentations plus loose units. */
function seedLine(productId: string, baseUnits: number): CartLine {
  const bulk = defaultPresentation(requireProduct(productId))
  return {
    productId,
    presentationId: bulk.id,
    qty: Math.floor(baseUnits / bulk.factor),
    looseQty: bulk.factor > 1 ? baseUnits % bulk.factor : 0,
  }
}

/** Initial Mostrador state: shared stock plus the pending orders with FEFO reservations. */
export function createInitialState(): CounterState {
  const state: CounterState = {
    lots: {},
    orders: [],
    payments: [],
    cashSessions: [],
    cashMovements: [],
    movements: [],
  }

  for (const entry of demoStock) {
    state.lots[stockKey(entry.productId, entry.warehouse)] = entry.lots.map(
      (lot) => ({
        id: lot.id,
        code: lot.code,
        quantity: lot.quantity,
        costCents: lot.costCents,
        expiresInDays: lot.expiresInDays,
        receivedDaysAgo: lot.receivedDaysAgo,
        salePriceCents: lot.salePriceCents,
        reserved: 0,
        blocked: false,
      }),
    )
  }

  for (const seed of demoPendingOrders) {
    const order: Order = {
      id: seed.id,
      warehouse: seed.warehouse,
      customerId: seed.customerId,
      customer: findCustomer(seed.customerId)?.name ?? 'Público general',
      channel: 'Sin registrar',
      fulfillment: 'Recolección',
      address: '',
      contact: '',
      terms: 'Sin registrar',
      notes: '',
      lines: [],
      status: seed.status,
      createdAt: null,
      shipments: [],
    }
    for (const line of seed.lines) {
      const quoted = quoteLine(
        state,
        seed.warehouse,
        seedLine(line.productId, line.quantity),
      )
      reserveLine(state, seed.warehouse, quoted)
      order.lines.push(quoted)
    }
    state.orders.push(order)
  }

  return state
}

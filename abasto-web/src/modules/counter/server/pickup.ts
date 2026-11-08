import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import type { PickupResult } from '#/modules/orders/services/order-actions'
import { pickupOrderInput } from '#/modules/orders/server/order-inputs'

/** The picked-up order and how it was paid. */
export type PickupWithReceipt = PickupResult

export const counterPickupFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => {
      const { orderId, payment } = parseInput(pickupOrderInput, data)
      return pickupOrder(actor, orderId, payment)
    }),
  )

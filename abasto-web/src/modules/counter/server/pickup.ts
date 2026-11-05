import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { pickupWithReceipt } from '#/modules/counter/server/pickup-receipt'
import { pickupOrderInput } from '#/modules/orders/server/order-inputs'

export type { PickupWithReceipt } from '#/modules/counter/server/pickup-receipt'

export const counterPickupFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      pickupWithReceipt(actor, parseInput(pickupOrderInput, data)),
    ),
  )

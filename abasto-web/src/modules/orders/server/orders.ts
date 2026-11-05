import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  cancelOrder,
  pickupOrder,
  prepareOrder,
} from '#/modules/orders/services/order-actions'
import { getOrder } from '#/modules/orders/services/order-reads'
import { createOrder } from '#/modules/orders/services/orders'
import { setReservationHours } from '#/modules/orders/services/reservation-settings'
import {
  createOrderInput,
  orderIdInput,
  reservationHoursInput,
} from '#/modules/orders/server/order-inputs'

export const orderDetailFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getOrder(actor, parseInput(orderIdInput, data).orderId),
    ),
  )

export const createOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createOrder(actor, parseInput(createOrderInput, data)),
    ),
  )

export const prepareOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      prepareOrder(actor, parseInput(orderIdInput, data).orderId),
    ),
  )

/** Pickup only hands the order over; payment is added with the cash module. */
export const pickupOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      pickupOrder(actor, parseInput(orderIdInput, data).orderId),
    ),
  )

export const cancelOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      cancelOrder(actor, parseInput(orderIdInput, data).orderId),
    ),
  )

export const setReservationHoursFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor(async (actor) => {
      const { hours } = parseInput(reservationHoursInput, data)
      await setReservationHours(actor, hours)
      return { hours }
    }),
  )

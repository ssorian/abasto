import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import type { OrderInput } from '#/modules/counter/lib/order-draft'
import {
  cancelOrderFn,
  createOrderFn,
  orderDetailFn,
  pickupOrderFn,
  prepareOrderFn,
  setReservationHoursFn,
} from '#/modules/orders/server/orders'

export const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

/**
 * Write actions of Mostrador. Each resolves to `{ data }` on success (the list
 * reloads) or to `undefined` after showing the server message as a toast.
 */
export function useOrderActions() {
  const router = useRouter()

  async function run<T>(
    action: () => Promise<Result<T>>,
    success: string,
  ): Promise<{ data: T } | undefined> {
    try {
      const data = unwrap(await action())
      await router.invalidate()
      toast.success(success)
      return { data }
    } catch (failure) {
      toast.error(messageOf(failure))
      // The order may have expired or changed meanwhile: show the fresh list.
      await router.invalidate()
      return undefined
    }
  }

  return {
    createOrder: (input: OrderInput) =>
      run(() => createOrderFn({ data: input }), 'Pedido reservado.'),
    prepare: (orderId: string) =>
      run(() => prepareOrderFn({ data: { orderId } }), 'Pedido preparado.'),
    pickup: (orderId: string) =>
      run(() => pickupOrderFn({ data: { orderId } }), 'Pedido entregado.'),
    cancel: (orderId: string) =>
      run(() => cancelOrderFn({ data: { orderId } }), 'Pedido cancelado.'),
    setHours: (hours: number) =>
      run(
        () => setReservationHoursFn({ data: { hours } }),
        'Duración de la reserva guardada.',
      ),
    detail: async (orderId: string) =>
      unwrap(await orderDetailFn({ data: { orderId } })),
  }
}

import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { counterPickupFn } from '#/modules/counter/server/pickup'
import type { PickupWithReceipt } from '#/modules/counter/server/pickup'
import type { PickupPayment } from '#/modules/orders/services/pickup-gate'
import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import type { OrderInput } from '#/modules/counter/lib/order-draft'
import {
  cancelOrderFn,
  createOrderFn,
  orderDetailFn,
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
    /**
     * Delivers the order with its payment. The refusal message comes back to
     * the payment step (no toast) so it can sit next to what to do about it.
     */
    pickup: async (
      orderId: string,
      payment: PickupPayment,
    ): Promise<
      { ok: true; data: PickupWithReceipt } | { ok: false; message: string }
    > => {
      try {
        const data = unwrap(
          await counterPickupFn({ data: { orderId, payment } }),
        )
        await router.invalidate()
        toast.success('Pedido entregado.')
        return { ok: true, data }
      } catch (failure) {
        await router.invalidate()
        return { ok: false, message: messageOf(failure) }
      }
    },
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

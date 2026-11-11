import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { counterPickupFn } from '#/modules/counter/server/pickup'
import type { PickupWithReceipt } from '#/modules/counter/server/pickup'
import type { PickupPayment } from '#/modules/orders/services/pickup-gate'
import { messageOf, useActionRunner } from '#/hooks/use-action-runner'
import { unwrap } from '#/lib/boundary'
import type { OrderInput } from '#/modules/counter/lib/order-draft'
import {
  cancelOrderFn,
  createOrderFn,
  orderDetailFn,
  prepareOrderFn,
  setReservationHoursFn,
} from '#/modules/orders/server/orders'

/**
 * Write actions of Mostrador. Each resolves to `{ data }` on success (the list
 * reloads and a Spanish toast confirms) or to `undefined` after showing the
 * server message as a toast. `pending` is true while one is saving.
 */
export function useOrderActions() {
  const router = useRouter()
  const run = useActionRunner()

  return {
    pending: run.pending,
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

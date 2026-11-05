import type { Actor } from '#/modules/access/lib/policy'
import { getCustomerStatement } from '#/modules/credit/services/customer-ledger'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import type { pickupOrderInput } from '#/modules/orders/server/order-inputs'
import type { z } from 'zod'

export type PickupWithReceipt = Awaited<ReturnType<typeof pickupWithReceipt>>

/** The picked-up order, how it was paid, and (credit) the day the charge falls due. */
export async function pickupWithReceipt(
  actor: Actor,
  { orderId, payment }: z.output<typeof pickupOrderInput>,
) {
  const result = await pickupOrder(actor, orderId, payment)
  let dueOn: string | null = null
  if (result.payment.terms === 'credito') {
    // The receipt is informational: a failed read must not undo a finished pickup.
    try {
      const statement = await getCustomerStatement(actor, result.customerId)
      dueOn =
        statement.entries.find((entry) => entry.orderId === orderId)?.dueOn ??
        null
    } catch {
      dueOn = null
    }
  }
  return { ...result, dueOn }
}

import { AppError } from '#/lib/errors'
import {
  assertCents,
  drawerClosed,
  lockOpenSession,
  postCashMovement,
} from '#/modules/cash/services/cash-ledger'
import { chargeOnCredit } from '#/modules/credit/services/credit-charge'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import type { orders } from '#/modules/orders/db/schema'

/** How the whole order is paid at pickup; there is no split. */
export type PickupPayment =
  { terms: 'contado'; tenderedCents: number } | { terms: 'credito' }

/** What was settled: cash adds the change handed back. */
export type PickupReceipt =
  | { terms: 'contado'; tenderedCents: number; changeCents: number }
  | { terms: 'credito' }

/**
 * Payment seam of the pickup: runs inside the pickup transaction, after the
 * warehouse stock lock. Cash is recorded in the warehouse's open drawer;
 * credit is charged to the customer's balance (or refused). Any refusal
 * rolls the whole pickup back.
 */
export async function settlePickup(
  tx: Tx,
  order: typeof orders.$inferSelect,
  payment: PickupPayment | undefined,
  actorId: string,
): Promise<PickupReceipt> {
  if (payment?.terms === 'credito') {
    await chargeOnCredit(tx, order, actorId)
    return { terms: 'credito' }
  }
  if (payment?.terms !== 'contado') {
    throw new AppError('invalid', 'Elige cómo se paga el pedido.')
  }
  assertCents(payment.tenderedCents)
  const session = await lockOpenSession(tx, order.warehouseId, drawerClosed)
  if (payment.tenderedCents < order.totalCents) {
    throw new AppError(
      'conflict',
      'El efectivo recibido no cubre el total del pedido.',
    )
  }
  const changeCents = payment.tenderedCents - order.totalCents
  await postCashMovement(tx, session, {
    type: 'sale',
    amountCents: order.totalCents,
    tenderedCents: payment.tenderedCents,
    changeCents,
    orderId: order.id,
    customerId: order.customerId,
    reason: 'Pedido recogido',
    actorId,
  })
  return { terms: 'contado', tenderedCents: payment.tenderedCents, changeCents }
}

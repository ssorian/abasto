import { AppError } from '#/lib/errors'
import {
  findAuthorization,
  markAuthorizationUsed,
} from '#/modules/credit/services/credit-authorizations'
import type { AuthorizationRequest } from '#/modules/credit/services/credit-authorizations'
import {
  customerPosition,
  lockCustomer,
  postCharge,
} from '#/modules/credit/services/customer-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import type { orders } from '#/modules/orders/db/schema'
import { businessDate } from '#/modules/orders/services/clock'

/**
 * Credit pickup refused. `request` is set when the owner has not been asked
 * yet: the caller creates it after the pickup transaction rolls back.
 */
export class CreditAuthorizationRequired extends AppError {
  readonly request: AuthorizationRequest | null

  constructor(message: string, request: AuthorizationRequest | null) {
    super('conflict', message)
    this.request = request
  }
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Charges a picked-up order to the customer's balance. Blocks when credit is
 * off, or (without an approved authorization for this order and amount) when
 * the balance plus the order exceeds the limit or any charge is overdue.
 */
export async function chargeOnCredit(
  tx: Tx,
  order: Pick<
    typeof orders.$inferSelect,
    'id' | 'customerId' | 'warehouseId' | 'totalCents'
  >,
  actorId: string,
) {
  const customer = await lockCustomer(tx, order.customerId)
  if (!customer.creditEnabled) {
    throw new AppError('conflict', 'Este cliente no tiene crédito habilitado.')
  }
  const { balanceCents, overdueCents } = await customerPosition(tx, customer.id)
  const blocked =
    overdueCents > 0 ||
    balanceCents + order.totalCents > customer.creditLimitCents
  if (blocked) {
    const authorization = await findAuthorization(
      tx,
      order.id,
      order.totalCents,
    )
    if (!authorization) {
      throw new CreditAuthorizationRequired(
        'Este pedido supera el límite de crédito o el cliente tiene saldo vencido. Pídele al dueño que lo autorice y vuelve a intentar.',
        {
          orderId: order.id,
          customerId: customer.id,
          amountCents: order.totalCents,
        },
      )
    }
    if (authorization.status === 'pending') {
      throw new CreditAuthorizationRequired(
        'Este pedido espera la autorización del dueño. Pídele que la apruebe y vuelve a intentar.',
        null,
      )
    }
    if (authorization.status === 'rejected') {
      throw new CreditAuthorizationRequired(
        'El dueño no autorizó el crédito de este pedido.',
        null,
      )
    }
    await markAuthorizationUsed(tx, authorization.id)
  }
  await postCharge(tx, {
    customerId: customer.id,
    orderId: order.id,
    amountCents: order.totalCents,
    dueOn: addDays(businessDate(), customer.termsDays),
    warehouseId: order.warehouseId,
    actorId,
  })
}

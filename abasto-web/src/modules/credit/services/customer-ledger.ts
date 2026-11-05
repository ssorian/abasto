import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize, can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import {
  assertCents,
  drawerClosed,
  lockOpenSession,
  postCashMovement,
} from '#/modules/cash/services/cash-ledger'
import { customerLedger } from '#/modules/credit/db/schema'
import { balanceOf, overdueOf } from '#/modules/credit/services/credit-balance'
import { customers } from '#/modules/customers/db/schema'
import { customerNotFound } from '#/modules/customers/services/customers'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { businessDate } from '#/modules/orders/services/clock'

export type LedgerEntry = typeof customerLedger.$inferSelect
type Customer = typeof customers.$inferSelect

/**
 * Locks the customer row until the transaction ends: charges and abonos of one
 * customer (from any warehouse) are applied one at a time. FOR NO KEY UPDATE
 * (not FOR UPDATE) so the FOR KEY SHARE that cash_movements and the ledger
 * take through their customer foreign key does not wait on it, which
 * deadlocked an abono against a cash pickup.
 */
export async function lockCustomer(tx: Tx, id: string): Promise<Customer> {
  const customer = (
    await tx
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .for('no key update')
  ).at(0)
  if (!customer) throw customerNotFound()
  return customer
}

export const customerEntries = (tx: Pick<Tx, 'select'>, customerId: string) =>
  tx
    .select()
    .from(customerLedger)
    .where(eq(customerLedger.customerId, customerId))
    .orderBy(asc(customerLedger.seq))

/** Total balance and overdue amount in cents, today in the business time zone. */
export async function customerPosition(
  tx: Pick<Tx, 'select'>,
  customerId: string,
) {
  const entries = await customerEntries(tx, customerId)
  return {
    balanceCents: balanceOf(entries),
    overdueCents: overdueOf(entries, businessDate()),
    entries,
  }
}

/** Appends a charge for a credit pickup. */
export async function postCharge(
  tx: Tx,
  charge: {
    customerId: string
    orderId: string
    amountCents: number
    dueOn: string
    warehouseId: string
    actorId: string
  },
) {
  await tx.insert(customerLedger).values({ type: 'charge', ...charge })
}

/** Cash received from a customer at the warehouse's open drawer, applied to the balance. */
export async function recordAbono(
  actor: Actor,
  input: { warehouseId: string; customerId: string; amountCents: number },
): Promise<LedgerEntry> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  assertCents(input.amountCents, 1)
  return db.transaction(async (tx) => {
    await lockCustomer(tx, input.customerId)
    const session = await lockOpenSession(tx, input.warehouseId, drawerClosed)
    const { balanceCents } = await customerPosition(tx, input.customerId)
    if (input.amountCents > balanceCents) {
      throw new AppError(
        'conflict',
        'El abono no puede ser mayor que el saldo del cliente.',
      )
    }
    const movement = await postCashMovement(tx, session, {
      type: 'abono',
      amountCents: input.amountCents,
      customerId: input.customerId,
      reason: 'Abono de cliente',
      actorId: actor.userId,
    })
    const [entry] = await tx
      .insert(customerLedger)
      .values({
        type: 'abono',
        customerId: input.customerId,
        amountCents: input.amountCents,
        cashMovementId: movement.id,
        warehouseId: input.warehouseId,
        actorId: actor.userId,
      })
      .returning()
    return entry
  })
}

/** Receiving payments needs operate in some warehouse; both staff roles have it. */
function authorizeReadingBalances(actor: Actor) {
  const operates =
    actor.role === 'owner' ||
    [...actor.assignments.keys()].some((id) =>
      can(actor, 'warehouse.operate', id),
    )
  if (!operates) {
    throw new AppError('forbidden', 'No tienes permiso para esta acción.')
  }
}

export type CustomerBalance = {
  customerId: string
  balanceCents: number
  overdueCents: number
  creditEnabled: boolean
  creditLimitCents: number
  termsDays: number
}

export async function getCustomerBalance(
  actor: Actor,
  customerId: string,
): Promise<CustomerBalance> {
  authorizeReadingBalances(actor)
  const customer = (
    await db.select().from(customers).where(eq(customers.id, customerId))
  ).at(0)
  if (!customer) throw customerNotFound()
  const { balanceCents, overdueCents } = await customerPosition(db, customerId)
  return {
    customerId,
    balanceCents,
    overdueCents,
    creditEnabled: customer.creditEnabled,
    creditLimitCents: customer.creditLimitCents,
    termsDays: customer.termsDays,
  }
}

export type StatementEntry = LedgerEntry & { balanceCents: number }

/** Entries oldest first, each with the balance after it. */
export async function getCustomerStatement(
  actor: Actor,
  customerId: string,
): Promise<CustomerBalance & { entries: Array<StatementEntry> }> {
  const balance = await getCustomerBalance(actor, customerId)
  let running = 0
  const entries = (await customerEntries(db, customerId)).map((entry) => {
    running += entry.type === 'charge' ? entry.amountCents : -entry.amountCents
    return { ...entry, balanceCents: running }
  })
  return { ...balance, entries }
}

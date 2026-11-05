import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { creditAuthorizations } from '#/modules/credit/db/schema'
import { customers } from '#/modules/customers/db/schema'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { orders } from '#/modules/orders/db/schema'

export type CreditAuthorization = typeof creditAuthorizations.$inferSelect
export type AuthorizationRequest = {
  orderId: string
  customerId: string
  amountCents: number
}

/** The authorization bound to this exact order and amount, if any. */
export async function findAuthorization(
  tx: Pick<Tx, 'select'>,
  orderId: string,
  amountCents: number,
) {
  return (
    await tx
      .select()
      .from(creditAuthorizations)
      .where(
        and(
          eq(creditAuthorizations.orderId, orderId),
          eq(creditAuthorizations.amountCents, amountCents),
        ),
      )
  ).at(0)
}

/**
 * Creates the pending request for the owner. Runs in its own transaction
 * (after the blocked pickup rolled back) and is idempotent per order and amount.
 */
export async function requestCreditAuthorization(
  request: AuthorizationRequest,
) {
  await db
    .insert(creditAuthorizations)
    .values({ ...request, status: 'pending' })
    .onConflictDoNothing()
}

export async function markAuthorizationUsed(tx: Tx, id: string) {
  await tx
    .update(creditAuthorizations)
    .set({ usedAt: new Date() })
    .where(eq(creditAuthorizations.id, id))
}

export type PendingAuthorization = CreditAuthorization & {
  customerName: string
  warehouseId: string
}

/** Pending requests for open orders, oldest first. Owner only. */
export async function listPendingCreditAuthorizations(
  actor: Actor,
): Promise<Array<PendingAuthorization>> {
  authorize(actor, 'credit.authorize')
  const rows = await db
    .select({
      authorization: creditAuthorizations,
      customerName: customers.name,
      warehouseId: orders.warehouseId,
    })
    .from(creditAuthorizations)
    .innerJoin(orders, eq(orders.id, creditAuthorizations.orderId))
    .innerJoin(customers, eq(customers.id, creditAuthorizations.customerId))
    .where(
      and(
        eq(creditAuthorizations.status, 'pending'),
        inArray(orders.status, ['Reservado', 'Preparado']),
      ),
    )
    .orderBy(
      asc(creditAuthorizations.requestedAt),
      asc(creditAuthorizations.id),
    )
  return rows.map((row) => ({
    ...row.authorization,
    customerName: row.customerName,
    warehouseId: row.warehouseId,
  }))
}

async function decide(
  actor: Actor,
  id: string,
  status: 'approved' | 'rejected',
): Promise<CreditAuthorization> {
  authorize(actor, 'credit.authorize')
  return db.transaction(async (tx) => {
    const current = (
      await tx
        .select()
        .from(creditAuthorizations)
        .where(eq(creditAuthorizations.id, id))
        .for('update')
    ).at(0)
    if (!current) {
      throw new AppError('not_found', 'No encontramos esa autorización.')
    }
    if (current.status !== 'pending') {
      throw new AppError('conflict', 'Esa autorización ya fue resuelta.')
    }
    const [decided] = await tx
      .update(creditAuthorizations)
      .set({ status, decidedBy: actor.userId, decidedAt: new Date() })
      .where(eq(creditAuthorizations.id, id))
      .returning()
    return decided
  })
}

export const approveCreditAuthorization = (actor: Actor, id: string) =>
  decide(actor, id, 'approved')

export const rejectCreditAuthorization = (actor: Actor, id: string) =>
  decide(actor, id, 'rejected')

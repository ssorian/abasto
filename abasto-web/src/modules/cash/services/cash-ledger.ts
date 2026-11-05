import { and, asc, eq, sql } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import { cashMovements, cashSessions } from '#/modules/cash/db/schema'
import type { CashMovementType } from '#/modules/cash/db/schema'
import { fitsInt4 } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

export type CashSession = typeof cashSessions.$inferSelect
export type CashMovement = typeof cashMovements.$inferSelect

export const invalidAmount = () =>
  new AppError(
    'invalid',
    'Revisa el monto: debe ser un número entero de centavos válido.',
  )

/** Asserts whole cents within int4 and at least `min`. */
export function assertCents(value: number, min = 0) {
  if (!fitsInt4(value) || value < min) throw invalidAmount()
}

export const noOpenSession = () =>
  new AppError('conflict', 'No hay una caja abierta en este almacén.')

export const drawerClosed = () =>
  new AppError('conflict', 'Abre la caja antes de cobrar.')

/**
 * Locks the warehouse's open session until the transaction ends, so cash
 * movements and the close of one drawer are serialized.
 */
export async function lockOpenSession(
  tx: Tx,
  warehouseId: string,
  whenMissing: () => AppError = noOpenSession,
): Promise<CashSession> {
  const session = (
    await tx
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.warehouseId, warehouseId),
          eq(cashSessions.status, 'open'),
        ),
      )
      .for('update')
  ).at(0)
  if (!session) throw whenMissing()
  return session
}

/** Opening cash plus every movement of the session. */
export async function expectedCash(
  tx: Pick<Tx, 'select'>,
  session: Pick<CashSession, 'id' | 'openingCents'>,
): Promise<number> {
  const [row] = await tx
    .select({
      total: sql<number>`coalesce(sum(${cashMovements.amountCents}), 0)::int`,
    })
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, session.id))
  return session.openingCents + row.total
}

export async function sessionMovements(
  tx: Pick<Tx, 'select'>,
  sessionId: string,
): Promise<Array<CashMovement>> {
  return tx
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId))
    .orderBy(asc(cashMovements.createdAt), asc(cashMovements.id))
}

/** Appends one movement to a locked, open session. */
export async function postCashMovement(
  tx: Tx,
  session: Pick<CashSession, 'id' | 'warehouseId'>,
  movement: {
    type: CashMovementType
    amountCents: number
    actorId: string
    reason?: string
    tenderedCents?: number
    changeCents?: number
    orderId?: string
    customerId?: string
  },
): Promise<CashMovement> {
  const [row] = await tx
    .insert(cashMovements)
    .values({
      sessionId: session.id,
      warehouseId: session.warehouseId,
      ...movement,
    })
    .returning()
  return row
}

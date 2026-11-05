import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { isUniqueViolation } from '#/db/errors'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { cashSessions } from '#/modules/cash/db/schema'
import {
  assertCents,
  expectedCash,
  lockOpenSession,
  sessionMovements,
} from '#/modules/cash/services/cash-ledger'
import type {
  CashMovement,
  CashSession,
} from '#/modules/cash/services/cash-ledger'
import { requireWarehouse } from '#/modules/inventory/services/stock-ledger'

export type CashSessionDetail = {
  session: CashSession
  movements: Array<CashMovement>
  /** Opening cash plus movements so far (the stored value once closed). */
  expectedCents: number
}

/** Opens the warehouse's drawer; at most one session is open per warehouse. */
export async function openCashSession(
  actor: Actor,
  input: { warehouseId: string; openingCents: number },
): Promise<CashSession> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  assertCents(input.openingCents)
  try {
    return await db.transaction(async (tx) => {
      await requireWarehouse(tx, input.warehouseId)
      const [session] = await tx
        .insert(cashSessions)
        .values({
          warehouseId: input.warehouseId,
          status: 'open',
          openingCents: input.openingCents,
          openedBy: actor.userId,
        })
        .returning()
      return session
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('conflict', 'Ya hay una caja abierta en este almacén.')
    }
    throw error
  }
}

/** Closes the open drawer with the counted cash; stores expected and difference. */
export async function closeCashSession(
  actor: Actor,
  input: { warehouseId: string; countedCents: number },
): Promise<CashSession> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  assertCents(input.countedCents)
  return db.transaction(async (tx) => {
    const session = await lockOpenSession(tx, input.warehouseId)
    const expectedCents = await expectedCash(tx, session)
    const [closed] = await tx
      .update(cashSessions)
      .set({
        status: 'closed',
        closedBy: actor.userId,
        closedAt: new Date(),
        countedCents: input.countedCents,
        expectedCents,
        differenceCents: input.countedCents - expectedCents,
      })
      .where(eq(cashSessions.id, session.id))
      .returning()
    return closed
  })
}

async function detail(session: CashSession): Promise<CashSessionDetail> {
  return {
    session,
    movements: await sessionMovements(db, session.id),
    expectedCents: session.expectedCents ?? (await expectedCash(db, session)),
  }
}

/** The warehouse's open session with its movements, or null. Needs operate. */
export async function getOpenCashSession(
  actor: Actor,
  warehouseId: string,
): Promise<CashSessionDetail | null> {
  authorize(actor, 'warehouse.operate', warehouseId)
  const session = (
    await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.warehouseId, warehouseId),
          eq(cashSessions.status, 'open'),
        ),
      )
  ).at(0)
  return session ? detail(session) : null
}

/** Every session of the warehouse, newest first, with movements. Owner and that warehouse's manager. */
export async function listCashSessions(
  actor: Actor,
  warehouseId: string,
): Promise<Array<CashSessionDetail>> {
  authorize(actor, 'warehouse.manage', warehouseId)
  const sessions = await db
    .select()
    .from(cashSessions)
    .where(eq(cashSessions.warehouseId, warehouseId))
    .orderBy(desc(cashSessions.openedAt), desc(cashSessions.id))
  return Promise.all(sessions.map(detail))
}

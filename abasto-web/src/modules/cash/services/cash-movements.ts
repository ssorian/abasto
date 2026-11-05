import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import {
  assertCents,
  expectedCash,
  lockOpenSession,
  postCashMovement,
} from '#/modules/cash/services/cash-ledger'
import type { CashMovement } from '#/modules/cash/services/cash-ledger'

type MoveInput = { warehouseId: string; amountCents: number; reason: string }

async function move(
  actor: Actor,
  input: MoveInput,
  direction: 1 | -1,
): Promise<CashMovement> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  assertCents(input.amountCents, 1)
  const reason = input.reason.trim()
  if (!reason) {
    throw new AppError('invalid', 'Escribe el motivo del movimiento.')
  }
  return db.transaction(async (tx) => {
    const session = await lockOpenSession(tx, input.warehouseId)
    if (
      direction < 0 &&
      input.amountCents > (await expectedCash(tx, session))
    ) {
      throw new AppError('conflict', 'No hay tanto efectivo en la caja.')
    }
    return postCashMovement(tx, session, {
      type: direction > 0 ? 'entry' : 'withdrawal',
      amountCents: direction * input.amountCents,
      reason,
      actorId: actor.userId,
    })
  })
}

/** Cash put into the open drawer (e.g. change from the bank); needs a reason. */
export const recordCashEntry = (actor: Actor, input: MoveInput) =>
  move(actor, input, 1)

/** Cash taken out of the open drawer; needs a reason and cannot exceed the cash held. */
export const recordCashWithdrawal = (actor: Actor, input: MoveInput) =>
  move(actor, input, -1)

import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { lots } from '#/modules/inventory/db/schema'
import { appendMovement } from '#/modules/inventory/services/stock-ledger'
import { now } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import {
  lockTransfer,
  transferNotFound,
} from '#/modules/transfers/services/transfer-lookup'

/** Cancels a transfer still in transit: every unit goes back to the lot it came from. */
export async function cancelTransfer(
  actor: Actor,
  input: { transferId: string },
): Promise<void> {
  const head = (
    await db
      .select({ fromWarehouseId: transfers.fromWarehouseId })
      .from(transfers)
      .where(eq(transfers.id, input.transferId))
  ).at(0)
  if (!head) throw transferNotFound()
  authorize(actor, 'warehouse.manage', head.fromWarehouseId)
  await db.transaction(async (tx) => {
    await expireOverdueOrders(tx, head.fromWarehouseId)
    const transfer = await lockTransfer(tx, input.transferId)
    const stored = await tx
      .select({ line: transferLines, source: lots })
      .from(transferLines)
      .innerJoin(lots, eq(lots.id, transferLines.sourceLotId))
      .where(eq(transferLines.transferId, transfer.id))
      .orderBy(asc(lots.id))
      .for('update', { of: lots })
    for (const { line, source } of stored) {
      await appendMovement(tx, source, {
        type: 'transfer_return',
        quantity: line.quantity,
        reason: 'Traslado cancelado',
        reference: transfer.id,
        actorId: actor.userId,
      })
    }
    await tx
      .update(transfers)
      .set({ status: 'Cancelado', closedBy: actor.userId, closedAt: now() })
      .where(eq(transfers.id, transfer.id))
  })
}

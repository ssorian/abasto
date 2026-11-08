import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { lots } from '#/modules/inventory/db/schema'
import {
  appendMovement,
  isWholeNumber,
} from '#/modules/inventory/services/stock-ledger'
import { now } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { transferredCostCents } from '#/modules/transfers/lib/transfer-cost'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import type { TransferStatus } from '#/modules/transfers/db/schema'
import {
  lockTransfer,
  transferNotFound,
} from '#/modules/transfers/services/transfer-lookup'
import { warehouses } from '#/modules/warehouses/db/schema'

export type ReceiveInput = {
  transferId: string
  /** One entry per line of the transfer, in base units. */
  lines: Array<{ lineId: string; receivedQuantity: number }>
}

/**
 * Records what arrived at the destination: every line's received quantity
 * (never above what was sent) becomes a lot there that keeps the source lot's
 * code, expiry and unit cost. Whatever did not arrive is a shortage, kept on
 * the transfer and counted as stock nowhere.
 */
export async function receiveTransfer(
  actor: Actor,
  input: ReceiveInput,
): Promise<{ status: TransferStatus }> {
  const head = (
    await db
      .select({ toWarehouseId: transfers.toWarehouseId })
      .from(transfers)
      .where(eq(transfers.id, input.transferId))
  ).at(0)
  if (!head) throw transferNotFound()
  authorize(actor, 'warehouse.manage', head.toWarehouseId)
  for (const line of input.lines) {
    if (!isWholeNumber(line.receivedQuantity) || line.receivedQuantity < 0) {
      throw new AppError(
        'invalid',
        'La cantidad recibida debe ser un entero de cero o más.',
      )
    }
  }
  return db.transaction(async (tx) => {
    await expireOverdueOrders(tx, head.toWarehouseId)
    const transfer = await lockTransfer(tx, input.transferId)
    const stored = await tx
      .select({
        line: transferLines,
        source: lots,
        from: warehouses.name,
      })
      .from(transferLines)
      .innerJoin(lots, eq(lots.id, transferLines.sourceLotId))
      .innerJoin(warehouses, eq(warehouses.id, transfer.fromWarehouseId))
      .where(eq(transferLines.transferId, transfer.id))
      .orderBy(asc(transferLines.id))
    const received = new Map(
      input.lines.map((line) => [line.lineId, line.receivedQuantity]),
    )
    if (
      received.size !== input.lines.length ||
      received.size !== stored.length ||
      stored.some(({ line }) => !received.has(line.id))
    ) {
      throw new AppError(
        'invalid',
        'Indica la cantidad recibida de cada línea del traslado.',
      )
    }
    if (stored.some(({ line }) => received.get(line.id)! > line.quantity)) {
      throw new AppError(
        'invalid',
        'Lo recibido no puede ser mayor que lo enviado.',
      )
    }
    let short = false
    for (const { line, source, from } of stored) {
      const arrived = received.get(line.id)!
      if (arrived < line.quantity) short = true
      let destinationLotId: string | null = null
      if (arrived > 0) {
        const [lot] = await tx
          .insert(lots)
          .values({
            productId: line.productId,
            warehouseId: transfer.toWarehouseId,
            sourceLotId: source.id,
            code: source.code,
            expiresOn: source.expiresOn,
            salePriceCents: source.salePriceCents,
            receivedQuantity: arrived,
            receivedCostCents: transferredCostCents(
              source.receivedCostCents,
              source.receivedQuantity,
              arrived,
            ),
            onHand: 0,
          })
          .returning()
        await appendMovement(tx, lot, {
          type: 'transfer_in',
          quantity: arrived,
          reason: `Traslado desde ${from}`,
          reference: transfer.id,
          actorId: actor.userId,
        })
        destinationLotId = lot.id
      }
      await tx
        .update(transferLines)
        .set({ receivedQuantity: arrived, destinationLotId })
        .where(eq(transferLines.id, line.id))
    }
    const status: TransferStatus = short
      ? 'Recibido con diferencia'
      : 'Recibido'
    await tx
      .update(transfers)
      .set({ status, closedBy: actor.userId, closedAt: now() })
      .where(eq(transfers.id, transfer.id))
    return { status }
  })
}

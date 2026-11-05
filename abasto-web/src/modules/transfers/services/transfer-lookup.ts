import { eq } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { transfers } from '#/modules/transfers/db/schema'

export const transferNotFound = () =>
  new AppError('not_found', 'No encontramos ese traslado.')

export const notInTransit = () =>
  new AppError('conflict', 'Este traslado ya no está en tránsito.')

/** The transfer row, locked until the transaction ends. */
export async function lockTransfer(tx: Tx, transferId: string) {
  const transfer = (
    await tx
      .select()
      .from(transfers)
      .where(eq(transfers.id, transferId))
      .for('update')
  ).at(0)
  if (!transfer) throw transferNotFound()
  if (transfer.status !== 'En tránsito') throw notInTransit()
  return transfer
}

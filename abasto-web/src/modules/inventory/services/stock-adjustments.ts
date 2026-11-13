import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { products } from '#/modules/catalog/db/schema'
import { productArchived } from '#/modules/catalog/services/product-reads'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { lossCategories, lots } from '#/modules/inventory/db/schema'
import type { LossCategory } from '#/modules/inventory/db/schema'
import {
  appendMovement,
  assertFitsInt4,
  insufficientStock,
  isWholeNumber,
  lockLot,
  MAX_INT4,
} from '#/modules/inventory/services/stock-ledger'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'

/** Locks the lot, checks the actor may adjust stock (owner only) and applies the movement. */
function moveLot(
  actor: Actor,
  lotId: string,
  type: 'adjustment' | 'loss',
  quantity: number,
  reason: string,
) {
  return db.transaction(async (tx) => {
    const found = (
      await tx
        .select({
          warehouseId: lots.warehouseId,
          archivedAt: products.archivedAt,
        })
        .from(lots)
        .innerJoin(products, eq(products.id, lots.productId))
        .where(eq(lots.id, lotId))
    ).at(0)
    if (!found) throw new AppError('not_found', 'No encontramos ese lote.')
    authorize(actor, 'stock.adjust', found.warehouseId)
    // Archived products only lose stock; nothing new may enter them.
    if (quantity > 0 && found.archivedAt) throw productArchived()
    // Overdue orders release their units before the lot is locked.
    await expireOverdueOrders(tx, found.warehouseId)
    const lot = await lockLot(tx, lotId)
    if (lot.onHand + quantity < 0) throw insufficientStock()
    await appendMovement(tx, lot, {
      type,
      quantity,
      reason,
      actorId: actor.userId,
    })
  })
}

/** Adds (positive) or removes (negative) base units from one lot, with a required reason. */
export async function adjustLot(
  actor: Actor,
  input: { lotId: string; quantity: number; reason: string },
) {
  const reason = input.reason.trim()
  if (!isWholeNumber(input.quantity) || input.quantity === 0) {
    throw new AppError(
      'invalid',
      'La cantidad del ajuste debe ser un entero distinto de cero.',
    )
  }
  assertFitsInt4(
    input.quantity,
    `La cantidad del ajuste no puede ser mayor que ${MAX_INT4}.`,
  )
  if (!reason) throw new AppError('invalid', 'Escribe el motivo del ajuste.')
  await moveLot(actor, input.lotId, 'adjustment', input.quantity, reason)
}

/** Removes base units from one lot as a loss (expired, damaged, other). */
export async function registerLoss(
  actor: Actor,
  input: {
    lotId: string
    quantity: number
    category: LossCategory
    reason: string
  },
) {
  if (!lossCategories.includes(input.category)) {
    throw new AppError('invalid', 'Selecciona el tipo de pérdida.')
  }
  if (!isWholeNumber(input.quantity) || input.quantity <= 0) {
    throw new AppError('invalid', 'La cantidad debe ser mayor que cero.')
  }
  assertFitsInt4(
    input.quantity,
    `La cantidad no puede ser mayor que ${MAX_INT4}.`,
  )
  const reason = input.reason.trim()
  if (!reason) throw new AppError('invalid', 'Escribe el motivo de la pérdida.')
  await moveLot(
    actor,
    input.lotId,
    'loss',
    -input.quantity,
    `${input.category}: ${reason}`,
  )
}

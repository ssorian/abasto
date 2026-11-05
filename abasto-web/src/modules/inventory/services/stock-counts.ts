import { and, asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { lots, stockCounts } from '#/modules/inventory/db/schema'
import {
  appendMovement,
  assertFitsInt4,
  byFefo,
  byNewest,
  isWholeNumber,
  MAX_INT4,
  requireProduct,
  requireWarehouse,
} from '#/modules/inventory/services/stock-ledger'

export type CountInput = {
  productId: string
  warehouseId: string
  /** Physical count in base units. */
  countedQuantity: number
  note?: string
}

/**
 * Registers a physical count of one product in one warehouse. A shortage is
 * taken from lots FEFO; a surplus goes to the most recently received lot; an
 * exact match only records the count.
 */
export async function countStock(actor: Actor, input: CountInput) {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  if (!isWholeNumber(input.countedQuantity) || input.countedQuantity < 0) {
    throw new AppError('invalid', 'La cantidad contada debe ser cero o mayor.')
  }
  assertFitsInt4(
    input.countedQuantity,
    `La cantidad contada no puede ser mayor que ${MAX_INT4}.`,
  )
  return db.transaction(async (tx) => {
    await requireWarehouse(tx, input.warehouseId)
    await requireProduct(tx, input.productId)
    // Locked in id order so concurrent counts cannot deadlock.
    const locked = await tx
      .select()
      .from(lots)
      .where(
        and(
          eq(lots.productId, input.productId),
          eq(lots.warehouseId, input.warehouseId),
        ),
      )
      .orderBy(asc(lots.id))
      .for('update')
    const expected = locked.reduce((sum, lot) => sum + lot.onHand, 0)
    const difference = input.countedQuantity - expected
    if (difference > 0 && !locked.length) {
      throw new AppError(
        'conflict',
        'No hay lotes de este producto en el almacén para registrar el excedente.',
      )
    }
    const [count] = await tx
      .insert(stockCounts)
      .values({
        productId: input.productId,
        warehouseId: input.warehouseId,
        expectedQuantity: expected,
        countedQuantity: input.countedQuantity,
        note: input.note?.trim() ?? '',
        actorId: actor.userId,
      })
      .returning({ id: stockCounts.id })
    const movement = {
      type: 'count' as const,
      reason: 'Conteo físico',
      reference: count.id,
      actorId: actor.userId,
    }
    if (difference > 0) {
      const newest = [...locked].sort(byNewest)[0]
      await appendMovement(tx, newest, { ...movement, quantity: difference })
    } else {
      let remaining = -difference
      for (const lot of [...locked].sort(byFefo)) {
        if (!remaining) break
        const take = Math.min(lot.onHand, remaining)
        if (!take) continue
        await appendMovement(tx, lot, { ...movement, quantity: -take })
        remaining -= take
      }
    }
    return {
      id: count.id,
      expected,
      counted: input.countedQuantity,
      difference,
    }
  })
}

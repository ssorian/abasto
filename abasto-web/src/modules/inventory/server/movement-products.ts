import { inArray } from 'drizzle-orm'
import { db } from '#/db'
import { lots } from '#/modules/inventory/db/schema'
import type { StockMovementRow } from '#/modules/inventory/services/stock-reads'
import type { MovementEntry } from '#/modules/inventory/types/stock'

/**
 * `listStockMovements` does not say which product a lot belongs to, so the
 * movements (already authorized by that read) are tagged from the lots table.
 */
export async function withProducts(
  movements: Array<StockMovementRow>,
): Promise<Array<MovementEntry>> {
  const ids = [...new Set(movements.map((movement) => movement.lotId))]
  if (!ids.length) return []
  const rows = await db
    .select({ id: lots.id, productId: lots.productId })
    .from(lots)
    .where(inArray(lots.id, ids))
  const productOf = new Map(rows.map((row) => [row.id, row.productId]))
  return movements.map((movement) => ({
    ...movement,
    productId: productOf.get(movement.lotId) ?? '',
  }))
}

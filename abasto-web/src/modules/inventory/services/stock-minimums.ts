import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { stockMinimums } from '#/modules/inventory/db/schema'
import {
  isWholeNumber,
  requireProduct,
  requireWarehouse,
} from '#/modules/inventory/services/stock-ledger'

/** Sets the minimum stock (base units) of a product in a warehouse; zero means none. */
export async function setMinimumStock(
  actor: Actor,
  input: { productId: string; warehouseId: string; minimum: number },
) {
  authorize(actor, 'warehouse.manage', input.warehouseId)
  if (!isWholeNumber(input.minimum) || input.minimum < 0) {
    throw new AppError('invalid', 'El mínimo debe ser cero o mayor.')
  }
  await db.transaction(async (tx) => {
    await requireWarehouse(tx, input.warehouseId)
    await requireProduct(tx, input.productId)
    await tx
      .insert(stockMinimums)
      .values(input)
      .onConflictDoUpdate({
        target: [stockMinimums.productId, stockMinimums.warehouseId],
        set: { minimum: input.minimum },
      })
  })
}

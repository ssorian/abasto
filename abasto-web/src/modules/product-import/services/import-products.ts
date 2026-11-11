import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { insertProduct, mapConflict } from '#/modules/catalog/services/products'
import type { ProductInput } from '#/modules/catalog/services/products'
import { stockMinimums } from '#/modules/inventory/db/schema'
import { MAX_INT4 } from '#/modules/inventory/services/stock-ledger'
import { presentationPrices } from '#/modules/pricing/db/schema'
import { validatePrices } from '#/modules/pricing/services/prices'
import { requireWarehouse } from '#/modules/pricing/services/price-reads'

/** One validated CSV row: the product plus its price and minimum in the chosen warehouse. */
export type ImportProductRow = {
  product: ProductInput
  /** Sale price of the default presentation, integer cents. */
  priceCents: number
  /** Minimum stock in base units; zero stores none. */
  minimum: number
}

export type ImportRowResult = { sku: string; error: string | null }

/**
 * Creates each row as a product and saves its `precio_venta` (price of the
 * default presentation) and `stock_minimo` in `warehouseId`. Every row is its
 * own transaction: a rejected row leaves no product, price or minimum behind,
 * and does not stop the others. Row problems come back as messages.
 */
export async function importProducts(
  actor: Actor,
  input: { warehouseId: string; rows: Array<ImportProductRow> },
): Promise<Array<ImportRowResult>> {
  authorize(actor, 'catalog.manage')
  authorize(actor, 'warehouse.manage', input.warehouseId)
  await requireWarehouse(db, input.warehouseId)
  const results: Array<ImportRowResult> = []
  for (const row of input.rows) {
    const sku = row.product.sku
    try {
      await db.transaction(async (tx) => {
        validatePrices([{ presentationId: '-', priceCents: row.priceCents }])
        if (row.priceCents > MAX_INT4) {
          throw new AppError('invalid', 'El precio es demasiado grande.')
        }
        if (
          !Number.isSafeInteger(row.minimum) ||
          row.minimum < 0 ||
          row.minimum > MAX_INT4
        ) {
          throw new AppError('invalid', 'El mínimo debe ser cero o mayor.')
        }
        const created = await insertProduct(tx, row.product)
        const main = created.presentations.find(({ isDefault }) => isDefault)
        if (!main)
          throw new AppError('invalid', 'Falta la presentación principal.')
        await tx.insert(presentationPrices).values({
          warehouseId: input.warehouseId,
          presentationId: main.id,
          priceCents: row.priceCents,
          createdBy: actor.userId,
          source: 'bulk',
          reason: 'Importación CSV',
        })
        if (row.minimum > 0) {
          await tx.insert(stockMinimums).values({
            productId: created.id,
            warehouseId: input.warehouseId,
            minimum: row.minimum,
          })
        }
      })
      results.push({ sku, error: null })
    } catch (failure) {
      const error = mapConflict(failure)
      if (!(error instanceof AppError)) throw error
      results.push({ sku, error: error.message })
    }
  }
  return results
}

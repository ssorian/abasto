import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { violatedUniqueIndex } from '#/modules/catalog/db/constraints'
import {
  validateSet,
  writeSet,
} from '#/modules/catalog/services/presentation-rules'
import type { PresentationSet } from '#/modules/catalog/services/presentation-rules'
import { loadProduct } from '#/modules/catalog/services/product-reads'
import type { Product } from '#/modules/catalog/services/product-reads'

/** Saves the full presentation set of a product; omitted stored rows are deactivated. */
export async function savePresentations(
  actor: Actor,
  productId: string,
  set: PresentationSet,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  try {
    return await db.transaction(async (tx) => {
      const current = await loadProduct(tx, productId)
      const existing = new Map(
        current.presentations.map((p) => [p.id, p.factor]),
      )
      const rows = validateSet(
        set,
        existing,
        'Ese código de barras ya pertenece a otra presentación.',
      )
      await writeSet(tx, productId, rows, set.defaultIndex)
      return loadProduct(tx, productId)
    })
  } catch (error) {
    if (violatedUniqueIndex(error) === 'presentations_barcode_unique') {
      throw new AppError(
        'conflict',
        'Ese código de barras ya pertenece a otra presentación.',
      )
    }
    throw error
  }
}

import { db } from '#/db'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import type { PresentationSet } from '#/modules/catalog/services/presentation-rules'
import {
  mapBarcodeConflict,
  writePresentations,
} from '#/modules/catalog/services/presentations'
import type { Product } from '#/modules/catalog/services/product-reads'
import { mapConflict, patchProduct } from '#/modules/catalog/services/products'
import type { ProductPatch } from '#/modules/catalog/services/products'

/**
 * The single save of "Editar producto": identity fields and presentations in
 * one transaction, so a rejected half leaves nothing of the other half behind.
 */
export async function updateProductWithPresentations(
  actor: Actor,
  id: string,
  input: { patch: ProductPatch; set: PresentationSet },
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  try {
    return await db.transaction(async (tx) => {
      await patchProduct(tx, id, input.patch)
      return writePresentations(tx, id, input.set)
    })
  } catch (error) {
    throw mapConflict(mapBarcodeConflict(error))
  }
}

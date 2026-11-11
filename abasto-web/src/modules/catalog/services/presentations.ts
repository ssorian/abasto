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
import type {
  Executor,
  Product,
} from '#/modules/catalog/services/product-reads'

/** Validates and writes a presentation set inside the caller's transaction. */
export async function writePresentations(
  tx: Executor,
  productId: string,
  set: PresentationSet,
): Promise<Product> {
  const current = await loadProduct(tx, productId)
  const existing = new Map(current.presentations.map((p) => [p.id, p.factor]))
  const rows = validateSet(set, existing, barcodeTaken)
  await writeSet(tx, productId, rows, set.defaultIndex)
  return loadProduct(tx, productId)
}

export const barcodeTaken =
  'Ese código de barras ya pertenece a otra presentación.'

/** The barcode conflict as the user-facing error; other errors pass through. */
export function mapBarcodeConflict(error: unknown): unknown {
  return violatedUniqueIndex(error) === 'presentations_barcode_unique'
    ? new AppError('conflict', barcodeTaken)
    : error
}

/** Saves the full presentation set of a product; omitted stored rows are deactivated. */
export async function savePresentations(
  actor: Actor,
  productId: string,
  set: PresentationSet,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  try {
    return await db.transaction((tx) => writePresentations(tx, productId, set))
  } catch (error) {
    throw mapBarcodeConflict(error)
  }
}

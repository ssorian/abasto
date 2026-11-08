import type { CartLine } from '#/modules/store/lib/cart'
import type {
  StorePresentation,
  StoreProduct,
} from '#/modules/store/services/storefront'

export type PickLine = {
  product: StoreProduct
  presentation: StorePresentation
  quantity: number
}

/**
 * Joins cart lines with the catalog. Lines whose presentation is no longer
 * sold in the warehouse come back in `gone` so the UI can offer to drop them.
 */
export function resolveCartLines(
  catalog: Array<StoreProduct>,
  lines: Array<CartLine>,
) {
  const index = new Map(
    catalog.flatMap((product) =>
      product.presentations.map(
        (presentation) => [presentation.id, { product, presentation }] as const,
      ),
    ),
  )
  const resolved: Array<PickLine> = []
  const gone: Array<string> = []
  for (const line of lines) {
    const found = index.get(line.presentationId)
    if (found) resolved.push({ ...found, quantity: line.quantity })
    else gone.push(line.presentationId)
  }
  return { resolved, gone }
}

/** Sum at list price, in cents. */
export const listTotal = (lines: Array<PickLine>) =>
  lines.reduce(
    (sum, line) => sum + line.presentation.priceCents * line.quantity,
    0,
  )

/** Quantity of one presentation in the cart (0 when absent). */
export const quantityIn = (lines: Array<CartLine>, presentationId: string) =>
  lines.find((line) => line.presentationId === presentationId)?.quantity ?? 0

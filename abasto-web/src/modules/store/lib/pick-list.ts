import type { CartPreviewState } from '#/modules/store/hooks/use-cart-preview'
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

/** Unit price shown for a line: the customer's own when previewed, else the list price. */
export function unitPriceOf(
  item: PickLine,
  signedIn: boolean,
  preview: CartPreviewState,
) {
  if (signedIn && preview.status === 'ready') {
    const line = preview.preview.lines.find(
      (entry) => entry.presentationId === item.presentation.id,
    )
    if (line?.unitPriceCents != null) return line.unitPriceCents
  }
  return item.presentation.priceCents
}

export type PricedTotal = {
  cents: number
  /** True while a signed-in customer's own price is still loading. */
  pending: boolean
}

/**
 * The one total every cart surface shows (bar, panel, sheet): the customer's
 * previewed total when signed in, the list total otherwise.
 */
export function pricedTotal(
  lines: Array<PickLine>,
  signedIn: boolean,
  preview: CartPreviewState,
): PricedTotal {
  if (signedIn && preview.status === 'ready') {
    return { cents: preview.preview.totalCents, pending: false }
  }
  const pending =
    signedIn &&
    lines.length > 0 &&
    (preview.status === 'idle' || preview.status === 'loading')
  return { cents: listTotal(lines), pending }
}

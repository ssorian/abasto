import { derivedPriceCents } from '#/modules/catalog/lib/catalog-presentations'

import type {
  CatalogProduct,
  PresentationDraft,
} from '#/modules/catalog/lib/catalog-types'

/**
 * Rows for the presentations dialog. A price equal to the one derived from the
 * catalog price is shown blank ("Calcular según el lote"), like an unfixed price.
 */
export const draftsFromProduct = (
  product: CatalogProduct,
): Array<PresentationDraft> =>
  product.presentations.map(({ priceCents, ...presentation }) => ({
    ...presentation,
    price:
      priceCents === derivedPriceCents(product, presentation.factor)
        ? ''
        : String(priceCents / 100),
  }))

/** Applies saved presentations to a product, keeping the default barcode in sync. */
export function withPresentations(
  product: CatalogProduct,
  presentations: CatalogProduct['presentations'],
  defaultId: string,
): CatalogProduct {
  const selected = presentations.find(({ id }) => id === defaultId)
  return {
    ...product,
    presentations,
    defaultPresentationId: defaultId,
    barcode: selected?.barcode ?? '',
  }
}

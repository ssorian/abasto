import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { Presentation } from '#/shared/demo/types'

export const defaultPresentation = (product: CatalogProduct) =>
  product.presentations.find(({ id }) => id === product.defaultPresentationId)

/** Name of the presentation the catalog price refers to ("cajas", "piezas"…). */
export const pricingLabel = (product: CatalogProduct) =>
  defaultPresentation(product)?.name ?? product.baseUnit

/** Price of one default presentation, in cents. */
export const catalogPriceCents = (product: CatalogProduct) =>
  defaultPresentation(product)?.priceCents ?? 0

/** Base units a default presentation holds; the catalog price is quoted for this many. */
export const pricingFactor = (product: CatalogProduct) =>
  defaultPresentation(product)?.factor ?? 1

/** Price of a presentation without a fixed price: the catalog price scaled by equivalence. */
export const derivedPriceCents = (product: CatalogProduct, factor: number) =>
  Math.round((catalogPriceCents(product) * factor) / pricingFactor(product))

export const newPresentationId = () =>
  `PRES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

export const blankPresentation = (): Presentation => ({
  id: newPresentationId(),
  name: '',
  factor: 1,
  priceCents: 0,
  barcode: '',
  active: true,
})

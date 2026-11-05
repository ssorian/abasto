import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

/** The presentation sold by default; falls back to the first active one. */
export const defaultPresentation = (product: CatalogProduct) =>
  product.presentations.find(({ isDefault }) => isDefault) ??
  product.presentations.find(({ active }) => active)

/** "Caja · 24 piezas", or the base unit when the product has no presentation yet. */
export function presentationLabel(product: CatalogProduct) {
  const presentation = defaultPresentation(product)
  return presentation
    ? `${presentation.name} · ${presentation.factor} ${product.unit}`
    : product.unit
}

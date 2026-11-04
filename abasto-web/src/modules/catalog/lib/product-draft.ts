import {
  catalogPriceCents,
  defaultPresentation,
  derivedPriceCents,
} from '#/modules/catalog/lib/catalog-presentations'

import type {
  CatalogProduct,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'

export const emptyProductDraft = (): ProductDraft => ({
  name: '',
  brand: '',
  sku: '',
  barcode: '',
  description: '',
  unit: 'piezas',
  category: 'Abarrotes',
  price: '',
  min: '0',
  image: '',
  published: false,
})

export const draftFromProduct = (product: CatalogProduct): ProductDraft => ({
  name: product.name,
  brand: product.brand,
  sku: product.sku,
  barcode: product.barcode,
  description: product.description,
  unit: product.baseUnit,
  category: product.category,
  price: String(catalogPriceCents(product) / 100),
  min: '0',
  image: product.image,
  published: product.published,
})

/** Applies validated draft values to an existing product or builds a new one. */
export function productFromDraft(
  draft: ProductDraft,
  priceCents: number,
  previous: CatalogProduct | undefined,
  newId: () => string,
): CatalogProduct {
  const common = {
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    sku: draft.sku.trim(),
    barcode: draft.barcode.trim(),
    description: draft.description.trim(),
    category: draft.category,
    image: draft.image,
    published: draft.published,
  }

  if (!previous)
    return {
      ...common,
      id: newId(),
      baseUnit: draft.unit,
      costCents: 0,
      defaultPresentationId: 'unit',
      presentations: [
        {
          id: 'unit',
          name: draft.unit,
          factor: 1,
          priceCents,
          barcode: common.barcode,
          active: true,
        },
      ],
    }

  const current = defaultPresentation(previous)
  const repriced = previous.presentations.map((presentation) =>
    presentation.id === current?.id
      ? { ...presentation, priceCents, barcode: common.barcode }
      : presentation,
  )
  const next = { ...previous, ...common, presentations: repriced }

  return {
    ...next,
    presentations: repriced.map((presentation) =>
      // Presentations without a fixed price follow the catalog price.
      presentation.id !== current?.id &&
      presentation.priceCents ===
        derivedPriceCents(previous, presentation.factor)
        ? {
            ...presentation,
            priceCents: derivedPriceCents(next, presentation.factor),
          }
        : presentation,
    ),
  }
}

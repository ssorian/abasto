import type {
  CatalogProduct,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'
import type {
  ProductInput,
  ProductPatch,
} from '#/modules/catalog/services/products'

export const emptyProductDraft = (): ProductDraft => ({
  name: '',
  brand: '',
  sku: '',
  barcode: '',
  description: '',
  unit: 'piezas',
  category: 'Abarrotes',
  supplierId: '',
  published: true,
})

export const draftFromProduct = (product: CatalogProduct): ProductDraft => ({
  name: product.name,
  brand: product.brand,
  sku: product.sku,
  barcode: '',
  description: product.description,
  unit: product.unit,
  category: product.category,
  supplierId: product.supplierId ?? '',
  published: product.published,
})

/** Fields shared by creating and editing; the server trims and validates them. */
const fieldsFromDraft = (draft: ProductDraft) => ({
  name: draft.name,
  sku: draft.sku,
  brand: draft.brand,
  description: draft.description,
  category: draft.category,
  supplierId: draft.supplierId || null,
  published: draft.published,
})

/** New product: one active base-unit presentation (factor 1) that is the default. */
export const productInputFromDraft = (draft: ProductDraft): ProductInput => ({
  ...fieldsFromDraft(draft),
  unit: draft.unit,
  presentations: [
    {
      name: draft.unit,
      factor: 1,
      barcode: draft.barcode.trim() || null,
      active: true,
    },
  ],
  defaultIndex: 0,
})

/** Edit: identity fields only. Unit and presentations are fixed or edited elsewhere. */
export const productPatchFromDraft = (draft: ProductDraft): ProductPatch =>
  fieldsFromDraft(draft)

import type {
  CatalogProduct,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'
import {
  formatTenThousandths,
  parseTenThousandths,
} from '#/lib/utils/supplier-cost'
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
  imageUrl: '',
  unit: 'piezas',
  category: 'Abarrotes',
  supplierId: '',
  published: true,
  supplierCode: '',
  fixedDiscount: '',
  promotion: '',
})

export const draftFromProduct = (product: CatalogProduct): ProductDraft => ({
  name: product.name,
  brand: product.brand,
  sku: product.sku,
  barcode: '',
  description: product.description,
  imageUrl: product.imageUrl ?? '',
  unit: product.unit,
  category: product.category,
  supplierId: product.supplierId ?? '',
  published: product.published,
  supplierCode: product.supplierCode,
  fixedDiscount: formatTenThousandths(product.fixedDiscountPerPiece),
  promotion: formatTenThousandths(product.promotionPerPiece),
})

type CostKey = 'fixedDiscount' | 'promotion'
const costKeys: ReadonlyArray<CostKey> = ['fixedDiscount', 'promotion']

const amountOf = (text: string) => {
  const parsed = parseTenThousandths(text)
  return parsed.ok ? parsed.value : 0
}

/** Per-field parse errors of the typed discount and promotion. */
export function supplierCostErrors(draft: ProductDraft) {
  const errors: Partial<Record<CostKey, string>> = {}
  for (const key of costKeys) {
    const parsed = parseTenThousandths(draft[key])
    if (!parsed.ok) errors[key] = parsed.message
  }
  return errors
}

/** Fields shared by creating and editing; the server trims and validates them. */
const fieldsFromDraft = (draft: ProductDraft) => ({
  name: draft.name,
  sku: draft.sku,
  brand: draft.brand,
  description: draft.description,
  imageUrl: draft.imageUrl.trim() || null,
  category: draft.category,
  supplierId: draft.supplierId || null,
  published: draft.published,
  supplierCode: draft.supplierCode,
  fixedDiscountPerPiece: amountOf(draft.fixedDiscount),
  promotionPerPiece: amountOf(draft.promotion),
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

import type {
  CatalogProduct,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'
import {
  formatTenThousandths,
  netCostPerPiece,
  parseTenThousandths,
} from '#/modules/catalog/lib/supplier-cost'
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
  listPrice: '',
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
  listPrice: formatTenThousandths(product.listPricePerPiece),
  fixedDiscount: formatTenThousandths(product.fixedDiscountPerPiece),
  promotion: formatTenThousandths(product.promotionPerPiece),
})

type CostKey = 'listPrice' | 'fixedDiscount' | 'promotion'
const costKeys: ReadonlyArray<CostKey> = [
  'listPrice',
  'fixedDiscount',
  'promotion',
]

const amountOf = (text: string) => {
  const parsed = parseTenThousandths(text)
  return parsed.ok ? parsed.value : 0
}

/** Net cost per piece of the typed amounts; unparsable fields count as zero. */
export const draftNetPerPiece = (draft: ProductDraft) =>
  netCostPerPiece(
    amountOf(draft.listPrice),
    amountOf(draft.fixedDiscount),
    amountOf(draft.promotion),
  )

/** Per-field parse errors, or `net` when discount and promotion exceed the list price. */
export function supplierCostErrors(draft: ProductDraft) {
  const errors: Partial<Record<CostKey | 'net', string>> = {}
  for (const key of costKeys) {
    const parsed = parseTenThousandths(draft[key])
    if (!parsed.ok) errors[key] = parsed.message
  }
  if (!Object.keys(errors).length && draftNetPerPiece(draft) < 0) {
    errors.net =
      'El descuento y la promoción no pueden superar el precio de lista.'
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
  listPricePerPiece: amountOf(draft.listPrice),
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

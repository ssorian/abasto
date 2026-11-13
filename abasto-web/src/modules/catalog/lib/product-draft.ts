import type {
  CatalogProduct,
  PresentationDraft,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'
import { presentationSetFromDrafts } from '#/modules/catalog/lib/presentation-draft'
import {
  formatTenThousandths,
  parseTenThousandths,
} from '#/lib/utils/supplier-cost'
import { parsePesos } from '#/modules/pricing/lib/money'
import type {
  NewProductInput,
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
  salePrice: '',
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
  salePrice: '',
})

type CostKey = 'listPrice' | 'fixedDiscount' | 'promotion'
const costKeys: ReadonlyArray<CostKey> = [
  'listPrice',
  'fixedDiscount',
  'promotion',
]

export const ABOVE_LIST_PRICE_MESSAGE =
  'El descuento y la promoción no pueden superar el costo por pieza.'

const amountOf = (text: string) => {
  const parsed = parseTenThousandths(text)
  return parsed.ok ? parsed.value : 0
}

/**
 * Per-field errors of the typed list price, discount and promotion: parse
 * messages, and the discount when it plus the promotion exceed the list price.
 */
export function supplierCostErrors(
  draft: Pick<ProductDraft, 'listPrice' | 'fixedDiscount' | 'promotion'>,
) {
  const errors: Partial<Record<CostKey, string>> = {}
  for (const key of costKeys) {
    const parsed = parseTenThousandths(draft[key])
    if (!parsed.ok) errors[key] = parsed.message
  }
  if (
    !Object.keys(errors).length &&
    amountOf(draft.fixedDiscount) + amountOf(draft.promotion) >
      amountOf(draft.listPrice)
  ) {
    errors.fixedDiscount = ABOVE_LIST_PRICE_MESSAGE
  }
  return errors
}

export const COST_REQUIRED_MESSAGE = 'Escribe el costo por pieza.'

/**
 * Errors of the "Costo y precio" section of a new product: the supplier cost
 * (required, same rules as the Prices dialog) and, when a warehouse is
 * selected, the sale price of the default presentation (required).
 */
export function newProductCostErrors(draft: ProductDraft, needsPrice: boolean) {
  const errors: Partial<Record<CostKey | 'salePrice', string>> =
    supplierCostErrors(draft)
  if (!errors.listPrice && !draft.listPrice.trim()) {
    errors.listPrice = COST_REQUIRED_MESSAGE
  }
  if (needsPrice) {
    const price = parsePesos(draft.salePrice)
    if (!price.ok) errors.salePrice = price.message
  }
  return errors
}

/**
 * Fields shared by creating and editing; the server trims and validates them.
 * Cost amounts are left out on purpose: they are edited in the Prices dialog,
 * so saving the product form can never overwrite them.
 */
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
})

const costAmountsFromDraft = (draft: ProductDraft) => ({
  listPricePerPiece: amountOf(draft.listPrice),
  fixedDiscountPerPiece: amountOf(draft.fixedDiscount),
  promotionPerPiece: amountOf(draft.promotion),
})

/** The initial price of the default presentation; absent without a warehouse. */
function salePriceFromDraft(draft: ProductDraft, warehouseId?: string | null) {
  const price = parsePesos(draft.salePrice)
  if (!warehouseId || !price.ok) return {}
  return { price: { warehouseId, priceCents: price.value } }
}

/**
 * New product. With the presentation rows typed in the form they are sent as
 * is (the server validates them in the same transaction); without them the
 * product gets one active base-unit presentation (factor 1) that is the default.
 */
export const productInputFromDraft = (
  draft: ProductDraft,
  rows?: ReadonlyArray<PresentationDraft>,
  defaultKey = '',
  warehouseId?: string | null,
): NewProductInput => ({
  ...fieldsFromDraft(draft),
  unit: draft.unit,
  ...costAmountsFromDraft(draft),
  ...salePriceFromDraft(draft, warehouseId),
  ...(rows
    ? presentationSetFromDrafts(rows, defaultKey)
    : {
        presentations: [
          {
            name: draft.unit,
            factor: 1,
            barcode: draft.barcode.trim() || null,
            active: true,
          },
        ],
        defaultIndex: 0,
      }),
})

/** Edit: identity fields only. Unit is fixed; presentations are saved on their own. */
export const productPatchFromDraft = (draft: ProductDraft): ProductPatch =>
  fieldsFromDraft(draft)

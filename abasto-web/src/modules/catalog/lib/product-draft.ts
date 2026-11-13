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

/**
 * Change of the supplier select. The brand follows the supplier while it is
 * blank or still the previous supplier's name; a brand typed by hand is kept.
 */
export function supplierChange(
  draft: Pick<ProductDraft, 'supplierId' | 'brand'>,
  supplierId: string,
  suppliers: ReadonlyArray<{ id: string; name: string }>,
): Pick<ProductDraft, 'supplierId' | 'brand'> {
  const nameOf = (id: string) =>
    suppliers.find((supplier) => supplier.id === id)?.name ?? ''
  const follows =
    !draft.brand.trim() || draft.brand === nameOf(draft.supplierId)
  return { supplierId, brand: follows ? nameOf(supplierId) : draft.brand }
}

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
 * Errors of the supplier cost of a new product: required, same rules as the
 * Prices dialog. Sale prices are checked per presentation.
 */
export function newProductCostErrors(draft: ProductDraft) {
  const errors = supplierCostErrors(draft)
  if (!errors.listPrice && !draft.listPrice.trim()) {
    errors.listPrice = COST_REQUIRED_MESSAGE
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

/** The typed sale price of each row, by position; absent without a warehouse. */
function salePricesFromRows(
  rows?: ReadonlyArray<PresentationDraft>,
  warehouseId?: string | null,
) {
  if (!warehouseId || !rows) return {}
  const cents = rows.map((row) => {
    const price = parsePesos(row.price)
    return price.ok ? price.value : null
  })
  return { prices: { warehouseId, cents } }
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
  ...salePricesFromRows(rows, warehouseId),
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

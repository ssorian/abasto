import {
  formatTenThousandths,
  parseTenThousandths,
} from '#/lib/utils/supplier-cost'
import { supplierCostErrors } from '#/modules/catalog/lib/product-draft'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { ProductDraft } from '#/modules/catalog/lib/catalog-types'
import type { ProductPatch } from '#/modules/catalog/services/products'

/** Typed price per piece, fixed discount and promotion (4 decimals of a peso). */
export type PieceCostDraft = Pick<
  ProductDraft,
  'listPrice' | 'fixedDiscount' | 'promotion'
>

/** The three supplier amounts of a product, in ten-thousandths of a peso. */
export type PieceCostAmounts = {
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
}

export const pieceCostDraftOf = (
  product: PieceCostAmounts,
): PieceCostDraft => ({
  listPrice: formatTenThousandths(product.listPricePerPiece),
  fixedDiscount: formatTenThousandths(product.fixedDiscountPerPiece),
  promotion: formatTenThousandths(product.promotionPerPiece),
})

/** Per-field errors, same rules and messages as the product form. */
export const pieceCostErrors = (draft: PieceCostDraft) =>
  supplierCostErrors(draft)

/** Patch for the catalog update: only the three amounts, or the first error. */
export function pieceCostPatchOf(
  draft: PieceCostDraft,
): Parsed<
  Required<
    Pick<
      ProductPatch,
      'listPricePerPiece' | 'fixedDiscountPerPiece' | 'promotionPerPiece'
    >
  >
> {
  const errors = pieceCostErrors(draft)
  const message = errors.listPrice ?? errors.fixedDiscount ?? errors.promotion
  if (message) return fail(message)
  const amount = (text: string) => {
    const parsed = parseTenThousandths(text)
    return parsed.ok ? parsed.value : 0
  }
  return {
    ok: true,
    value: {
      listPricePerPiece: amount(draft.listPrice),
      fixedDiscountPerPiece: amount(draft.fixedDiscount),
      promotionPerPiece: amount(draft.promotion),
    },
  }
}

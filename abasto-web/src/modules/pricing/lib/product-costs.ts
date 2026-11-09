import {
  netCostPerBoxCents,
  netCostPerPiece,
  parseTenThousandths,
} from '#/lib/utils/supplier-cost'
import {
  pieceCostErrors,
  pieceCostPatchOf,
} from '#/modules/pricing/lib/piece-cost-draft'
import type { PieceCostDraft } from '#/modules/pricing/lib/piece-cost-draft'
import { formatCents } from '#/modules/pricing/lib/money'

type StoredCost = {
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
}

const amountOf = (text: string) => {
  const parsed = parseTenThousandths(text)
  return parsed.ok ? parsed.value : 0
}

/**
 * Net cost of the typed amounts: per piece in ten-thousandths and per box in
 * cents. Null while any amount is invalid, so nothing wrong is ever shown.
 */
export function netCostOf(draft: PieceCostDraft, boxFactor: number) {
  if (Object.keys(pieceCostErrors(draft)).length) return null
  const perPiece = netCostPerPiece(
    amountOf(draft.listPrice),
    amountOf(draft.fixedDiscount),
    amountOf(draft.promotion),
  )
  return { perPiece, perBoxCents: netCostPerBoxCents(perPiece, boxFactor) }
}

/**
 * Cost before the fixed discount and promotion: the typed price per piece in
 * ten-thousandths and price × pieces per box in cents. Null while the price
 * per piece is invalid; it does not depend on the discounts being valid.
 */
export function grossCostOf(draft: PieceCostDraft, boxFactor: number) {
  const parsed = parseTenThousandths(draft.listPrice)
  if (!parsed.ok) return null
  return {
    perPiece: parsed.value,
    perBoxCents: netCostPerBoxCents(parsed.value, boxFactor),
  }
}

/** Patch with the three amounts, null when they equal the stored ones, or the first error. */
export function costPatchIfChanged(draft: PieceCostDraft, stored: StoredCost) {
  const patch = pieceCostPatchOf(draft)
  if (!patch.ok) return patch
  const unchanged =
    patch.value.listPricePerPiece === stored.listPricePerPiece &&
    patch.value.fixedDiscountPerPiece === stored.fixedDiscountPerPiece &&
    patch.value.promotionPerPiece === stored.promotionPerPiece
  return { ok: true as const, value: unchanged ? null : patch.value }
}

/**
 * Margin hint of one sale price against the net cost of the same presentation
 * (net per piece × factor). Null when there is no price or no cost to compare.
 */
export function saleCheck(
  factor: number,
  priceCents: number | null,
  netPerPiece: number,
) {
  if (priceCents === null || priceCents <= 0 || netPerPiece <= 0) return null
  const costCents = netCostPerBoxCents(netPerPiece, factor)
  return {
    costCents,
    marginBps: Math.round(((priceCents - costCents) * 10_000) / priceCents),
    belowCost: priceCents < costCents,
  }
}

/** Net cost per piece for the card: pesos with 2 decimals, half up. */
export const formatPieceCost = (netPerPiece: number) =>
  formatCents(Math.floor((netPerPiece + 50) / 100))

/** Net cost per piece of a stored product, in ten-thousandths. */
export const netCostPerPieceOf = (product: StoredCost) =>
  netCostPerPiece(
    product.listPricePerPiece,
    product.fixedDiscountPerPiece,
    product.promotionPerPiece,
  )

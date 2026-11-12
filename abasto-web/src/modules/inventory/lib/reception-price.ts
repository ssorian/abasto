import {
  formatTenThousandths,
  grossLineCents,
  netLineCents,
  parseTenThousandths,
} from '#/lib/utils/supplier-cost'

/** Supplier amounts of an ordered line, per piece in ten-thousandths of a peso. */
export type LinePrice = {
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
}

/** What price editing needs of a reception line; lines without `price` are not priced. */
type PricedLine = {
  orderedBoxes: number
  boxFactor?: number
  price?: LinePrice
}

export const missingPiecePrice = 'Escribe el costo por pieza.'
export const piecePriceBelowDiscounts =
  'El descuento y la promoción no pueden superar el costo por pieza.'

/** The stored list price as the field shows it: "1.2000". */
export const piecePriceText = (line: PricedLine) =>
  line.price ? formatTenThousandths(line.price.listPricePerPiece) : ''

/** Typed text → list price per piece; undefined text means the ordered price. */
function parsePiecePrice(
  line: PricedLine,
  text: string | undefined,
): { ok: true; value: number } | { ok: false; message: string } {
  if (!line.price) return { ok: true, value: 0 }
  if (text === undefined) {
    return { ok: true, value: line.price.listPricePerPiece }
  }
  if (!text.trim()) return { ok: false, message: missingPiecePrice }
  const parsed = parseTenThousandths(text)
  if (!parsed.ok) return parsed
  const { fixedDiscountPerPiece, promotionPerPiece } = line.price
  if (fixedDiscountPerPiece + promotionPerPiece > parsed.value) {
    return { ok: false, message: piecePriceBelowDiscounts }
  }
  return parsed
}

/** Why the typed price cannot be used, or null. */
export function piecePriceIssue(line: PricedLine, text: string | undefined) {
  const parsed = parsePiecePrice(line, text)
  return parsed.ok ? null : parsed.message
}

/** The typed price when valid and different from the ordered one. */
export function changedPiecePrice(line: PricedLine, text: string | undefined) {
  if (!line.price) return undefined
  const parsed = parsePiecePrice(line, text)
  return parsed.ok && parsed.value !== line.price.listPricePerPiece
    ? parsed.value
    : undefined
}

/**
 * Net cost of the whole ordered line at the typed price (same rounding as the
 * server); null while the price is not valid or the line is not priced.
 */
export function lineTotalCents(line: PricedLine, text: string | undefined) {
  if (!line.price) return null
  const parsed = parsePiecePrice(line, text)
  if (!parsed.ok) return null
  const quantity = line.orderedBoxes * (line.boxFactor ?? 1)
  return netLineCents(
    grossLineCents(quantity, parsed.value),
    quantity,
    line.price.fixedDiscountPerPiece,
    line.price.promotionPerPiece,
  )
}

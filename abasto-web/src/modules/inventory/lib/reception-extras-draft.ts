import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import {
  changedPiecePrice,
  lineTotalCents,
  piecePriceIssue,
} from '#/modules/inventory/lib/reception-price'
import type { LinePrice } from '#/modules/inventory/lib/reception-price'
import { missingExpiry } from '#/modules/inventory/lib/reception-draft'
import { boxFactorOf } from '#/modules/inventory/lib/supplier-order-draft'
import type { OrderProduct } from '#/modules/inventory/lib/supplier-order-draft'
import type { ReceptionExtraInput } from '#/modules/inventory/services/reception-extras'

/** A supplier product that can be added at reception without being ordered. */
export type ExtraLine = {
  productId: string
  name: string
  sku: string
  boxFactor: number
  /** Catalog amounts; the list price is the starting value of the field. */
  price: LinePrice
}

/** Typed values of one added product. */
export type ExtraDraft = {
  boxes: string
  /** Typed list price per piece; undefined keeps the catalog price. */
  price?: string
  expiresOn: string
  noExpiry?: boolean
}

/** Added products by product id, in the order they were added. */
export type ExtrasDraft = Readonly<Record<string, ExtraDraft | undefined>>

export const missingExtraBoxes = 'Escribe cuántas cajas llegaron.'

export const extraLineOf = (product: OrderProduct): ExtraLine => ({
  productId: product.id,
  name: product.name,
  sku: product.sku,
  boxFactor: boxFactorOf(product),
  price: {
    listPricePerPiece: product.listPricePerPiece,
    fixedDiscountPerPiece: product.fixedDiscountPerPiece,
    promotionPerPiece: product.promotionPerPiece,
  },
})

/** Adds a product with one box; adding it again keeps what was typed. */
export const addExtra = (extras: ExtrasDraft, productId: string) =>
  extras[productId]
    ? extras
    : { ...extras, [productId]: { boxes: '1', expiresOn: '' } }

export const removeExtra = (extras: ExtrasDraft, productId: string) =>
  Object.fromEntries(
    Object.entries(extras).filter(([id]) => id !== productId),
  ) as ExtrasDraft

const boxesOf = (text: string) => {
  const parsed = parseBoxCount(text)
  return parsed.ok ? parsed.value : 0
}

/** The added product as a priced line of its typed boxes. */
const pricedOf = (line: ExtraLine, entry: ExtraDraft) => ({
  orderedBoxes: boxesOf(entry.boxes),
  boxFactor: line.boxFactor,
  price: line.price,
})

/** Net cost of the typed boxes at the typed price; null while not valid. */
export const extraTotalCents = (line: ExtraLine, entry: ExtraDraft) =>
  lineTotalCents(pricedOf(line, entry), entry.price)

/** Problems by product id; empty when every added product is valid. */
export function extraIssues(
  lines: ReadonlyArray<ExtraLine>,
  extras: ExtrasDraft,
): Record<string, string> {
  const issues: Record<string, string> = {}
  for (const line of lines) {
    const entry = extras[line.productId]
    if (!entry) continue
    const boxes = parseBoxCount(entry.boxes)
    const price = piecePriceIssue(pricedOf(line, entry), entry.price)
    if (!boxes.ok) issues[line.productId] = boxes.message
    else if (boxes.value === 0) issues[line.productId] = missingExtraBoxes
    else if (price) issues[line.productId] = price
    else if (!entry.expiresOn && !entry.noExpiry) {
      issues[line.productId] = missingExpiry
    }
  }
  return issues
}

/**
 * Added products → server extras, the price only when it differs from the
 * catalog. Also says whether any enters already expired and how many changed
 * their price.
 */
export function extrasInput(
  lines: ReadonlyArray<ExtraLine>,
  extras: ExtrasDraft,
  today: string,
): Parsed<{
  extras: Array<ReceptionExtraInput>
  expired: boolean
  changed: number
}> {
  const issue = Object.values(extraIssues(lines, extras)).at(0)
  if (issue) return fail(issue)
  const added = lines.flatMap((line) => {
    const entry = extras[line.productId]
    return entry ? [{ line, entry }] : []
  })
  const values = added.map(({ line, entry }) => {
    const price = changedPiecePrice(pricedOf(line, entry), entry.price)
    return {
      productId: line.productId,
      boxes: boxesOf(entry.boxes),
      ...(entry.expiresOn
        ? { expiresOn: entry.expiresOn }
        : { noExpiry: true }),
      ...(price === undefined ? {} : { listPricePerPiece: price }),
    }
  })
  return {
    ok: true,
    value: {
      extras: values,
      expired: values.some(
        (value) => 'expiresOn' in value && value.expiresOn < today,
      ),
      changed: values.filter((value) => 'listPricePerPiece' in value).length,
    },
  }
}

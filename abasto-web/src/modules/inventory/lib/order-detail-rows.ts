import { formatTenThousandths } from '#/lib/utils/supplier-cost'
import type { SupplierOrder } from '#/modules/inventory/services/supplier-orders'

type OrderLine = SupplierOrder['lines'][number]

/** One read-only line of the order detail. Box counts are null until the order is received. */
export type OrderDetailRow = {
  id: string
  productName: string
  sku: string
  ordered: boolean
  /** Null for lines that arrived without being ordered. */
  orderedBoxes: number | null
  goodBoxes: number | null
  missingBoxes: number | null
  damagedBoxes: number | null
  /** Charged list price per piece. */
  pricePerPieceText: string
  /** Ordered price, only when it differs from the charged one. */
  orderedPriceText: string | null
  priceDelta: 'up' | 'down' | null
  totalCents: number
}

const toBoxes = (units: number | null, factor: number) =>
  units === null ? null : units / Math.max(factor, 1)

/** The ordered price when this ordered line was charged a different one. */
const orderedPrice = (line: OrderLine) =>
  line.ordered &&
  line.orderedListPricePerPiece !== null &&
  line.orderedListPricePerPiece !== line.listPricePerPiece
    ? line.orderedListPricePerPiece
    : null

export function orderDetailRow(line: OrderLine): OrderDetailRow {
  const ordered = orderedPrice(line)
  return {
    id: line.id,
    productName: line.productName,
    sku: line.sku,
    ordered: line.ordered,
    orderedBoxes: line.ordered ? line.boxes : null,
    goodBoxes: toBoxes(line.goodQuantity, line.boxFactor),
    missingBoxes: toBoxes(line.missingQuantity, line.boxFactor),
    damagedBoxes: toBoxes(line.damagedQuantity, line.boxFactor),
    pricePerPieceText: formatTenThousandths(line.listPricePerPiece),
    orderedPriceText: ordered === null ? null : formatTenThousandths(ordered),
    priceDelta:
      ordered === null
        ? null
        : line.listPricePerPiece > ordered
          ? 'up'
          : 'down',
    totalCents: line.totalCostCents,
  }
}

/** How many lines were charged at another price and how many arrived without being ordered. */
export function orderDetailNotes(order: Pick<SupplierOrder, 'lines'>) {
  return {
    repriced: order.lines.filter((line) => orderedPrice(line) !== null).length,
    unordered: order.lines.filter((line) => !line.ordered).length,
  }
}

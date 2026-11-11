import { countLabel } from '#/modules/counter/lib/sellable'
import { parseQuantity } from '#/modules/counter/lib/order-draft'
import type { DraftLine } from '#/modules/counter/lib/order-draft'

/** What the stock check needs to know about a presentation. */
export type StockOption = {
  presentationId: string
  productId: string
  /** Base units (pieces) in one presentation. */
  factor: number
  /** Base units of the product that can still be reserved. */
  availableBase: number
  /** Base unit in plural ("piezas"). */
  unit: string
}

export type StockShortage = {
  requested: number
  available: number
  unit: string
}

/**
 * Lines of the same product share one stock: sums them in base units and
 * flags every line of a product whose total exceeds what is available.
 * Blank or invalid quantities count as zero; unknown lines are skipped.
 */
export function findStockShortages(
  lines: ReadonlyArray<DraftLine>,
  optionOf: ReadonlyMap<string, StockOption>,
): Map<string, StockShortage> {
  const requestedOf = new Map<string, number>()
  for (const line of lines) {
    const option = optionOf.get(line.presentationId)
    if (!option) continue
    const base = (parseQuantity(line.quantity) ?? 0) * option.factor
    requestedOf.set(
      option.productId,
      (requestedOf.get(option.productId) ?? 0) + base,
    )
  }
  const shortages = new Map<string, StockShortage>()
  for (const line of lines) {
    const option = optionOf.get(line.presentationId)
    if (!option) continue
    const requested = requestedOf.get(option.productId) ?? 0
    if (requested > option.availableBase) {
      shortages.set(line.presentationId, {
        requested,
        available: option.availableBase,
        unit: option.unit,
      })
    }
  }
  return shortages
}

export const stockShortageMessage = (shortage: StockShortage) =>
  `Pides ${countLabel(shortage.requested, shortage.unit)} en total y solo hay ${countLabel(shortage.available, shortage.unit)} ${shortage.available === 1 ? 'disponible' : 'disponibles'}.`

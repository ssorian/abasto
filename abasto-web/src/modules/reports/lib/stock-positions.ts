import { addDays } from '#/modules/reports/lib/period'
import { demoStock } from '#/shared/demo/inventory'
import { findProduct } from '#/shared/demo/products'

import type { StockPosition } from '#/modules/reports/types/reports'

/** Receipt of the initial demo load, in days before today. */
const INITIAL_LOAD_DAYS_AGO = 3

/** Warehouse stock of the demo seeds as report positions (costs per base unit). */
export function demoPositions(today: string): Array<StockPosition> {
  return demoStock.map((entry) => {
    const product = findProduct(entry.productId)
    const factor =
      product?.presentations.find((p) => p.id === product.defaultPresentationId)
        ?.factor ?? 1

    return {
      productId: entry.productId,
      warehouse: entry.warehouse,
      reserved: entry.reserved,
      entryDates: entry.lots.length
        ? [addDays(today, -INITIAL_LOAD_DAYS_AGO)]
        : [],
      layers: entry.lots.map((lot) => ({
        quantity: lot.quantity,
        unitCostCents: lot.costCents / factor,
        receivedDate: addDays(today, -lot.receivedDaysAgo),
        expiryDate: addDays(today, lot.expiresInDays),
        blocked: false,
      })),
    }
  })
}

/** Replaces the position of the same product and warehouse, or adds it. */
export function withPosition(
  positions: ReadonlyArray<StockPosition>,
  next: StockPosition,
) {
  const same = (p: StockPosition) =>
    p.productId === next.productId && p.warehouse === next.warehouse
  return positions.some(same)
    ? positions.map((p) => (same(p) ? next : p))
    : [...positions, next]
}

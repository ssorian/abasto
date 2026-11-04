import { findStock } from '#/shared/demo/inventory'
import { demoProducts } from '#/shared/demo/products'
import { warehouseNames } from '#/shared/demo/types'

import type { StockEntry, WarehouseName } from '#/shared/demo/types'

export type WarehouseSummary = {
  name: WarehouseName
  /** Two-digit position shown as the card art number, e.g. "01". */
  number: string
  city: string
  description: string
  productsInStock: number
  productsToRestock: number
}

const descriptions: Record<WarehouseName, string> = {
  Centro: 'Centro de distribución principal',
  Norte: 'Punto de distribución Norte',
  Sur: 'Nuevo punto de distribución',
}

const physicalOf = (stock: StockEntry | undefined) =>
  stock?.lots.reduce((sum, lot) => sum + lot.quantity, 0) ?? 0

/** Units that can be sold: physical minus expired lots and reservations. */
function availableOf(stock: StockEntry) {
  const usable = stock.lots
    .filter((lot) => lot.expiresInDays >= 0)
    .reduce((sum, lot) => sum + lot.quantity, 0)
  return Math.max(0, usable - stock.reserved)
}

/** Products that need restocking: sold out or at/below their minimum. */
function needsRestock(stock: StockEntry | undefined) {
  if (!stock?.received) return false
  if (physicalOf(stock) === 0) return true
  const available = availableOf(stock)
  return available > 0 && available <= stock.minStock
}

export function warehouseSummaries(): Array<WarehouseSummary> {
  return warehouseNames.map((name, index) => {
    const stocks = demoProducts.map((product) => findStock(product.id, name))
    return {
      name,
      number: String(index + 1).padStart(2, '0'),
      city: 'TEJUPILCO',
      description: descriptions[name],
      productsInStock: stocks.filter((stock) => physicalOf(stock) > 0).length,
      productsToRestock: stocks.filter(needsRestock).length,
    }
  })
}

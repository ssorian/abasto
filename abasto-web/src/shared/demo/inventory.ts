import { demoProducts } from './products'
import { warehouseNames } from './types'

import type { StockEntry, StockLot, WarehouseName } from './types'

/** Whole default presentations on hand per product, in product order. */
const packsByWarehouse: Record<WarehouseName, ReadonlyArray<number>> = {
  Centro: [92, 125, 18, 48, 0, 66, 10, 24],
  Norte: [45, 60, 32, 20, 16, 24, 35, 15],
  Sur: [0, 0, 0, 0, 0, 0, 0, 0],
}

/** Whole default presentations reserved by pending orders (Centro only). */
const reservedPacks: ReadonlyArray<number> = [10, 4, 6, 8, 0, 0, 0, 24]

/** Minimum stock in whole default presentations. */
const minimumPacks: ReadonlyArray<number> = [20, 30, 20, 15, 10, 15, 15, 10]

function buildLots(
  index: number,
  warehouse: WarehouseName,
  packs: number,
): Array<StockLot> {
  const product = demoProducts[index]
  const factor =
    product.presentations.find((p) => p.id === product.defaultPresentationId)
      ?.factor ?? 1
  const isMilk = product.id === 'lala'
  const olderPacks = Math.floor(packs * 0.4)

  const lots: Array<StockLot> = [
    {
      id: `old-${product.id}-${warehouse}`,
      code: `L-A-${index + 1}`,
      quantity: olderPacks * factor,
      costCents:
        product.id === 'coca' ? 38500 : Math.round(product.costCents * 0.97),
      expiresInDays: isMilk ? 12 : 120,
      receivedDaysAgo: 25,
    },
    {
      id: `new-${product.id}-${warehouse}`,
      code: `L-B-${index + 1}`,
      quantity: (packs - olderPacks) * factor,
      costCents: product.costCents,
      expiresInDays: isMilk ? 55 : 180,
      receivedDaysAgo: 3,
      ...(product.id === 'coca' && warehouse === 'Centro'
        ? { salePriceCents: 47000 }
        : {}),
    },
  ]

  return lots.filter((lot) => lot.quantity > 0)
}

export const demoStock: ReadonlyArray<StockEntry> = warehouseNames.flatMap(
  (warehouse) =>
    demoProducts.map((product, index) => {
      const factor =
        product.presentations.find(
          (p) => p.id === product.defaultPresentationId,
        )?.factor ?? 1
      const packs = packsByWarehouse[warehouse][index]

      return {
        productId: product.id,
        warehouse,
        received: warehouse !== 'Sur',
        reserved: warehouse === 'Centro' ? reservedPacks[index] * factor : 0,
        minStock: minimumPacks[index] * factor,
        lots: buildLots(index, warehouse, packs),
      }
    }),
)

export function findStock(productId: string, warehouse: WarehouseName) {
  return demoStock.find(
    (entry) => entry.productId === productId && entry.warehouse === warehouse,
  )
}

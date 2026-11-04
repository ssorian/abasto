import { demoStock } from '#/shared/demo/inventory'
import { demoProducts } from '#/shared/demo/products'
import { dayFromToday } from '#/modules/inventory/lib/format'
import { consumptionOrder, physicalOf } from '#/modules/inventory/lib/stock'

import type {
  Entry,
  InventoryState,
  Lot,
  Movement,
  StockRecord,
} from '#/modules/inventory/types/inventory'

const DEMO_ACTOR = 'Carga de demo'

function seedLots(
  entry: (typeof demoStock)[number],
  factor: number,
): Array<Lot> {
  const lots = entry.lots.map<Lot>((lot) => ({
    id: lot.id,
    code: lot.code,
    qty: lot.quantity,
    reserved: 0,
    cost: lot.costCents / 100 / factor,
    expiry: dayFromToday(lot.expiresInDays),
    receivedAt: `${dayFromToday(-lot.receivedDaysAgo)}T${lot.code.startsWith('L-A') ? '09:00:00' : '10:30:00'}`,
    receiptId: lot.id,
    salePrice:
      lot.salePriceCents === undefined ? undefined : lot.salePriceCents / 100,
    blocked: false,
    blockReason: '',
  }))

  // Reservations commit the lots that leave first.
  let left = entry.reserved
  for (const lot of [...lots].sort(consumptionOrder)) {
    const take = Math.min(left, lot.qty)
    lot.reserved = take
    left -= take
  }

  return lots
}

/** Initial inventory built from the shared demo seeds; dates are relative to now. */
export function createInitialState(): InventoryState {
  const stocks: Array<StockRecord> = demoStock.map((entry) => {
    const product = demoProducts.find((item) => item.id === entry.productId)
    const pack = product?.presentations.find(
      (presentation) => presentation.id === product.defaultPresentationId,
    )
    const factor = pack?.factor ?? 1
    const lots = seedLots(entry, factor)
    const latest = [...lots]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .at(0)

    return {
      productId: entry.productId,
      warehouse: entry.warehouse,
      received: entry.received,
      reserved: entry.reserved,
      min: entry.minStock,
      last: latest?.cost ?? (product?.costCents ?? 0) / 100 / factor,
      lastDate: `${dayFromToday(-3)}T10:30:00`,
      lots,
    }
  })

  const entries: Array<Entry> = demoProducts.flatMap((product) =>
    stocks
      .filter(
        (stock) => stock.productId === product.id && physicalOf(stock.lots) > 0,
      )
      .map((stock) => ({
        id: `INI-${product.id}-${stock.warehouse}`,
        warehouse: stock.warehouse,
        reference: 'Carga inicial de demostración',
        date: `${dayFromToday(-3)}T10:30:00`,
        lines: stock.lots.map((lot) => ({
          productId: product.id,
          qty: lot.qty,
          cost: lot.cost,
          lot: lot.code,
          expiry: lot.expiry,
        })),
      })),
  )

  const movements: Array<Movement> = entries.flatMap((entry) =>
    entry.lines.map((line, index) => {
      const lot = stocks
        .find(
          (stock) =>
            stock.productId === line.productId &&
            stock.warehouse === entry.warehouse,
        )
        ?.lots.find((item) => item.code === line.lot)

      return {
        id: `${entry.id}-${index}`,
        productId: line.productId,
        warehouse: entry.warehouse,
        type: 'Entrada' as const,
        qty: line.qty,
        cost: line.cost,
        date: lot?.receivedAt ?? entry.date,
        lot: line.lot,
        expiry: line.expiry,
        note: 'Recepción de inventario',
        ref: entry.id,
        actor: DEMO_ACTOR,
      }
    }),
  )

  return {
    stocks,
    entries,
    movements,
    counts: [],
    transfers: [],
    priceHistory: [],
    labels: [],
  }
}

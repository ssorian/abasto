import { warehouseNames } from '#/shared/demo/types'
import { dayFromToday } from '#/modules/inventory/lib/format'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  InventoryState,
  Lot,
  LotStatus,
  StockRecord,
  StockStatus,
  StockView,
  WarehouseScope,
} from '#/modules/inventory/types/inventory'

export const isExpired = (lot: Lot) =>
  !!lot.expiry && lot.expiry < dayFromToday(0)

export const isBlocked = (lot: Lot) => lot.blocked || isExpired(lot)

export const daysLeft = (expiry: string) =>
  Math.round(
    (Date.parse(`${expiry}T12:00:00`) -
      Date.parse(`${dayFromToday(0)}T12:00:00`)) /
      864e5,
  )

export const lotStatus = (lot: Lot): LotStatus => {
  if (isExpired(lot)) return 'Vencido'
  if (lot.blocked) return 'Bloqueado'
  if (lot.expiry && daysLeft(lot.expiry) <= 30) return 'Por vencer'
  return 'Disponible'
}

export const physicalOf = (lots: ReadonlyArray<Lot>) =>
  lots.reduce((sum, lot) => sum + lot.qty, 0)

export const blockedQuantity = (stock: StockView) =>
  stock.lots.filter(isBlocked).reduce((sum, lot) => sum + lot.qty, 0)

export const usable = (stock: StockView) =>
  stock.physical - blockedQuantity(stock)

export const available = (stock: StockView) =>
  stock.aggregateAvailable ?? Math.max(0, usable(stock) - stock.reserved)

/** Average cost per base unit across the lots on hand. */
export const averageCost = (stock: StockView) =>
  stock.physical
    ? stock.lots.reduce((sum, lot) => sum + lot.qty * lot.cost, 0) /
      stock.physical
    : 0

export function stockStatus(stock: StockView): StockStatus {
  if (!stock.received) return 'Sin inventario'
  if (stock.physical === 0) return 'Agotado'
  if (usable(stock) < stock.reserved) return 'Revisar reservas'
  if (usable(stock) === 0) return 'Bloqueado'
  if (available(stock) === 0) return 'Reservado'
  if (available(stock) <= stock.min) return 'Stock bajo'
  return 'Disponible'
}

export const toView = (record: StockRecord): StockView => ({
  received: record.received,
  reserved: record.reserved,
  min: record.min,
  last: record.last,
  lastDate: record.lastDate,
  lots: record.lots,
  physical: physicalOf(record.lots),
})

export function findRecord(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
) {
  return state.stocks.find(
    (record) =>
      record.productId === productId && record.warehouse === warehouse,
  )
}

export function requireRecord(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
) {
  const record = findRecord(state, productId, warehouse)
  if (!record) throw new Error('Existencias no encontradas.')
  return record
}

/** Stock of one warehouse, or the sum of all of them for `Todos`. */
export function stockFor(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseScope,
): StockView {
  if (warehouse !== 'Todos') {
    return toView(requireRecord(state, productId, warehouse))
  }

  const views = warehouseNames.map((name) =>
    toView(requireRecord(state, productId, name)),
  )
  const latest = [...views].sort((a, b) =>
    b.lastDate.localeCompare(a.lastDate),
  )[0]

  return {
    aggregateAvailable: views.reduce((sum, view) => sum + available(view), 0),
    physical: views.reduce((sum, view) => sum + view.physical, 0),
    reserved: views.reduce((sum, view) => sum + view.reserved, 0),
    last: latest.last,
    lastDate: latest.lastDate,
    min: views.reduce((sum, view) => sum + view.min, 0),
    lots: views.flatMap((view) => view.lots),
    received: views.some((view) => view.received),
  }
}

/** Lots in the order stock leaves: nearest expiry first, then oldest. */
export const consumptionOrder = (a: Lot, b: Lot) =>
  (a.expiry || '9999').localeCompare(b.expiry || '9999') ||
  a.receivedAt.localeCompare(b.receivedAt)

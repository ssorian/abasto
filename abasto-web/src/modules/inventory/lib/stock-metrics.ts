import type { ProductStock } from '#/modules/inventory/services/stock-reads'

/** Lots expiring within this many days count as "por vencer". */
export const EXPIRY_WARNING_DAYS = 7

const DAY_MS = 86_400_000

/** Calendar days from `today` to `date` (both YYYY-MM-DD); negative when past. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS)
}

export type ExpiryState = 'none' | 'expired' | 'soon' | 'ok'

export function expiryState(
  expiresOn: string | null,
  today: string,
): ExpiryState {
  if (!expiresOn) return 'none'
  const days = daysUntil(expiresOn, today)
  if (days < 0) return 'expired'
  return days <= EXPIRY_WARNING_DAYS ? 'soon' : 'ok'
}

export type WarehouseMetrics = {
  /** Products with at least one unit on hand. */
  productsWithStock: number
  /** Sum of base units on hand. */
  totalUnits: number
  belowMinimum: number
  /** Lots with stock expiring from today through the warning window. */
  expiringLots: number
  /** Lots with stock already past their expiry date. */
  expiredLots: number
}

export function warehouseMetrics(
  stock: ReadonlyArray<ProductStock>,
  today: string,
): WarehouseMetrics {
  const metrics: WarehouseMetrics = {
    productsWithStock: 0,
    totalUnits: 0,
    belowMinimum: 0,
    expiringLots: 0,
    expiredLots: 0,
  }
  for (const row of stock) {
    if (row.onHand > 0) metrics.productsWithStock += 1
    metrics.totalUnits += row.onHand
    if (row.belowMinimum) metrics.belowMinimum += 1
    for (const lot of row.lots) {
      const state = expiryState(lot.expiresOn, today)
      if (state === 'soon') metrics.expiringLots += 1
      if (state === 'expired') metrics.expiredLots += 1
    }
  }
  return metrics
}

export type ProductStatus = 'Disponible' | 'Stock bajo' | 'Sin existencias'
export type StatusFilter = 'Todos' | ProductStatus
export const statusFilters: ReadonlyArray<StatusFilter> = [
  'Todos',
  'Disponible',
  'Stock bajo',
  'Sin existencias',
]

export function productStatus(row: ProductStock): ProductStatus {
  if (row.available <= 0) return 'Sin existencias'
  return row.belowMinimum ? 'Stock bajo' : 'Disponible'
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export function filterStock(
  rows: ReadonlyArray<ProductStock>,
  query: string,
  filter: StatusFilter,
): Array<ProductStock> {
  const needle = normalize(query.trim())
  return rows.filter(
    (row) =>
      (filter === 'Todos' || productStatus(row) === filter) &&
      (!needle || normalize(`${row.name} ${row.sku}`).includes(needle)),
  )
}

import type {
  DateRange,
  ReportWarehouse,
} from '#/modules/reports/types/reports'

/**
 * Margin figures of one group. Money is in integer cents; `marginBps` is the
 * margin over revenue in basis points (10000 = 100 %), rounded to the nearest
 * point, and null when there is no revenue to compare.
 */
export type MarginRow = {
  key: string
  name: string
  orders: number
  units: number
  revenueCents: number
  costCents: number
  marginCents: number
  marginBps: number | null
}

export type MarginTotals = Omit<MarginRow, 'key' | 'name'>

export type MarginReport = {
  range: DateRange
  warehouses: Array<ReportWarehouse>
  summary: MarginTotals
  byProduct: Array<MarginRow & { sku: string; unit: string }>
  /** Products without a supplier are grouped as key `none`, "Sin proveedor". */
  bySupplier: Array<MarginRow>
  byWarehouse: Array<MarginRow>
}

export type WarehouseMetrics = {
  revenueCents: number
  costCents: number
  marginCents: number
  marginBps: number | null
  /** Picked-up orders. */
  tickets: number
  /** Revenue ÷ tickets rounded to cents; 0 without tickets. */
  averageTicketCents: number
}

/** current − previous. `*Bps` fields are null when either side is undefined. */
export type WarehouseDelta = {
  revenueCents: number
  marginCents: number
  /** Margin-percent change in basis points (percentage-point change × 100). */
  marginBps: number | null
  tickets: number
  averageTicketCents: number
  /** Revenue change relative to previous, in basis points; null when previous revenue is 0. */
  revenueChangeBps: number | null
}

export type WarehouseRankingRow = {
  key: string
  name: string
  current: WarehouseMetrics
  previous: WarehouseMetrics
  delta: WarehouseDelta
}

export type WarehouseRanking = {
  range: DateRange
  previousRange: DateRange
  /** Every warehouse, best revenue first (idle ones last, by name). */
  rows: Array<WarehouseRankingRow>
}

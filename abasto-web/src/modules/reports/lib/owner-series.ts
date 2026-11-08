import { metricsOf } from '#/modules/executive/lib/profitability'
import type {
  MarginRow,
  WarehouseMetrics,
} from '#/modules/executive/types/profitability'
import { addDays, daysBetween } from '#/modules/reports/lib/period'
import type {
  CashCutRow,
  DateRange,
  LotAlertRow,
  LowStockRow,
  SalesRow,
} from '#/modules/reports/types/reports'

/** Change over the previous value in basis points; null without a previous value. */
export const relativeChangeBps = (current: number, previous: number) =>
  previous ? Math.round(((current - previous) * 10_000) / previous) : null

/** The previous period of the whole business: the sum over every warehouse. */
export function previousTotals(
  rows: ReadonlyArray<{ previous: WarehouseMetrics }>,
): WarehouseMetrics {
  const sum = (pick: (metrics: WarehouseMetrics) => number) =>
    rows.reduce((total, row) => total + pick(row.previous), 0)
  return metricsOf(
    sum((m) => m.revenueCents),
    sum((m) => m.costCents),
    sum((m) => m.tickets),
  )
}

export type DailyPoint = {
  day: string
  /** Same position in the previous period. */
  previousDay: string
  revenueCents: number
  marginCents: number
  /** Tickets: picked-up orders of the day. */
  orders: number
  averageTicketCents: number
  previousRevenueCents: number
}

type DaySales = { range: DateRange; rows: ReadonlyArray<SalesRow> }

/**
 * One point per day of the current range (days without sales are zero), each
 * paired with the day at the same position of the previous range.
 */
export function dailySeries(
  current: DaySales,
  previous: DaySales,
): Array<DailyPoint> {
  const now = new Map(current.rows.map((row) => [row.key, row]))
  const before = new Map(previous.rows.map((row) => [row.key, row]))
  const length = daysBetween(current.range.from, current.range.to) + 1
  return Array.from({ length }, (_, index) => {
    const day = addDays(current.range.from, index)
    const previousDay = addDays(previous.range.from, index)
    const row = now.get(day)
    return {
      day,
      previousDay,
      revenueCents: row?.revenueCents ?? 0,
      marginCents: row?.marginCents ?? 0,
      orders: row?.orders ?? 0,
      averageTicketCents: row?.orders
        ? Math.round(row.revenueCents / row.orders)
        : 0,
      previousRevenueCents: before.get(previousDay)?.revenueCents ?? 0,
    }
  })
}

/** Most profitable products first; products that lost money are left out. */
export function topProfitProducts<T extends MarginRow>(
  rows: ReadonlyArray<T>,
  limit: number,
): Array<T> {
  return rows
    .filter((row) => row.marginCents > 0)
    .sort(
      (a, b) => b.marginCents - a.marginCents || a.name.localeCompare(b.name),
    )
    .slice(0, limit)
}

export type SupplierShare = MarginRow & { shareBps: number }

/** Each supplier's share of the total sales, in basis points. */
export function supplierShares(
  rows: ReadonlyArray<MarginRow>,
): Array<SupplierShare> {
  const total = rows.reduce((sum, row) => sum + row.revenueCents, 0)
  return rows.map((row) => ({
    ...row,
    shareBps: total ? Math.round((row.revenueCents * 10_000) / total) : 0,
  }))
}

export type IdleBucket = {
  key: '30' | '60' | '90'
  label: string
  valueCents: number
  products: number
}

/** Idle stock split by days without a sale; never sold counts as 90 or more. */
export function nonMovingBuckets(
  rows: ReadonlyArray<{
    daysSinceLastSale: number | null
    valueCents: number
  }>,
): Array<IdleBucket> {
  const buckets: Array<IdleBucket> = [
    { key: '30', label: '30 días', valueCents: 0, products: 0 },
    { key: '60', label: '60 días', valueCents: 0, products: 0 },
    { key: '90', label: '90 o más', valueCents: 0, products: 0 },
  ]
  for (const row of rows) {
    const days = row.daysSinceLastSale
    const bucket = days === null || days >= 90 ? 2 : days >= 60 ? 1 : 0
    buckets[bucket].valueCents += row.valueCents
    buckets[bucket].products += 1
  }
  return buckets
}

export type CashDifferenceSummary = {
  closed: number
  withDifference: number
  /** Counted minus expected, over the closed cuts. */
  totalCents: number
}

export function cashDifferenceSummary(
  rows: ReadonlyArray<CashCutRow>,
): CashDifferenceSummary {
  const closed = rows.filter((row) => row.differenceCents !== null)
  return {
    closed: closed.length,
    withDifference: closed.filter((row) => row.differenceCents !== 0).length,
    totalCents: closed.reduce(
      (sum, row) => sum + (row.differenceCents ?? 0),
      0,
    ),
  }
}

export type StockAlertSummary = {
  lowStockCount: number
  lowStockByWarehouse: Array<{ name: string; count: number }>
  expiringCount: number
  expiringValueCents: number
  /** Earliest expiry date among the expiring lots. */
  nextExpiry: string | null
}

export function stockAlertSummary(alerts: {
  lowStock: ReadonlyArray<LowStockRow>
  expiring: ReadonlyArray<LotAlertRow>
}): StockAlertSummary {
  const counts = new Map<string, number>()
  for (const row of alerts.lowStock) {
    counts.set(row.warehouseName, (counts.get(row.warehouseName) ?? 0) + 1)
  }
  const dates = alerts.expiring.map((lot) => lot.expiresOn).sort()
  return {
    lowStockCount: alerts.lowStock.length,
    lowStockByWarehouse: [...counts].map(([name, count]) => ({ name, count })),
    expiringCount: alerts.expiring.length,
    expiringValueCents: alerts.expiring.reduce(
      (sum, lot) => sum + lot.valueCents,
      0,
    ),
    nextExpiry: dates[0] ?? null,
  }
}

/** Axis tick for money in cents: "$950", "$25 mil", "$1.5 M". */
export function compactMoney(cents: number) {
  const pesos = Math.abs(cents) / 100
  const sign = cents < 0 ? '-' : ''
  const trim = (value: number) => String(Number(value.toFixed(1)))
  if (pesos >= 1_000_000) return `${sign}$${trim(pesos / 1_000_000)} M`
  if (pesos >= 1_000) return `${sign}$${trim(pesos / 1_000)} mil`
  return `${sign}$${trim(pesos)}`
}

const months = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

/** "2026-11-08" → "8 nov". */
export function shortDay(date: string) {
  const [, month = '1', day = '1'] = date.split('-')
  return `${Number(day)} ${months[Number(month) - 1] ?? ''}`
}

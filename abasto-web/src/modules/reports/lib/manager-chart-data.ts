import { businessDate } from '#/modules/orders/services/clock'
import { addDays, daysBetween } from '#/modules/reports/lib/period'
import type {
  CashCutRow,
  DateRange,
  LowStockRow,
  ProductSalesRow,
  SalesRow,
} from '#/modules/reports/types/reports'

/** The same number of days right before `range`, to compare against. */
export function previousRange(range: DateRange): DateRange {
  const days = daysBetween(range.from, range.to) + 1
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) }
}

export type DailyPoint = {
  date: string
  revenueCents: number
  /** Same position (day) of the previous period; zero when it had no sale. */
  previousCents: number
}

/** One point per day of the range, days without sales included as zero. */
export function dailySeries(
  range: DateRange,
  current: ReadonlyArray<SalesRow>,
  previous: ReadonlyArray<SalesRow>,
): Array<DailyPoint> {
  const before = previousRange(range)
  const revenueOf = (rows: ReadonlyArray<SalesRow>, date: string) =>
    rows.find((row) => row.key === date)?.revenueCents ?? 0
  const days = daysBetween(range.from, range.to) + 1
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(range.from, index)
    return {
      date,
      revenueCents: revenueOf(current, date),
      previousCents: revenueOf(previous, addDays(before.from, index)),
    }
  })
}

/** Change from `previous` to `current` in basis points; null without a base. */
export const changeBps = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) * 10_000) / previous) : null

export type TopProduct = {
  key: string
  name: string
  marginCents: number
  widthPercent: number
}

/** Best `limit` products by gross profit, with bar widths relative to the best. */
export function topByMargin(
  rows: ReadonlyArray<ProductSalesRow>,
  limit: number,
): Array<TopProduct> {
  const ranked = rows
    .filter((row) => row.marginCents > 0)
    .sort(
      (a, b) => b.marginCents - a.marginCents || a.name.localeCompare(b.name),
    )
    .slice(0, limit)
  const best = ranked[0]?.marginCents ?? 0
  return ranked.map((row) => ({
    key: row.key,
    name: row.name,
    marginCents: row.marginCents,
    widthPercent: Math.round((row.marginCents * 100) / best),
  }))
}

export type StockLevel = {
  name: string
  available: number
  minimum: number
  /** Share of the minimum that is on hand, 0–100. */
  percent: number
  /** Under a quarter of the minimum. */
  critical: boolean
}

export function stockLevels(
  rows: ReadonlyArray<Pick<LowStockRow, 'name' | 'available' | 'minimum'>>,
): Array<StockLevel> {
  return rows
    .map(({ name, available, minimum }) => {
      const percent =
        minimum > 0
          ? Math.min(100, Math.max(0, Math.round((available * 100) / minimum)))
          : 0
      return { name, available, minimum, percent, critical: percent < 25 }
    })
    .sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name))
}

export type CashPoint = { date: string; differenceCents: number }

/**
 * Business day (Mexico City) of a cut: the day it was closed, or the day it
 * opened while still open. Dates may arrive as ISO strings from the server.
 */
export const cashCutDay = (
  row: Pick<CashCutRow, 'openedAt' | 'closedAt'>,
): string => businessDate(new Date(row.closedAt ?? row.openedAt))

/** Difference of the closed cuts, oldest first, by the business day they closed. */
export function cashDifferenceSeries(
  rows: ReadonlyArray<
    Pick<CashCutRow, 'status' | 'openedAt' | 'closedAt' | 'differenceCents'>
  >,
): Array<CashPoint> {
  return rows
    .filter((row) => row.status === 'closed' && row.differenceCents !== null)
    .map((row) => ({
      date: cashCutDay(row),
      differenceCents: row.differenceCents ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

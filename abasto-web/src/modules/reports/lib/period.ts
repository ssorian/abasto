import { AppError } from '#/lib/errors'
import type { DateRange, PeriodInput } from '#/modules/reports/types/reports'

const DAY_MS = 86_400_000
const MAX_DAYS = 366

/** Noon UTC, so day arithmetic never crosses a boundary. */
const parse = (date: string) => new Date(`${date}T12:00:00Z`)

/** A real calendar date written as YYYY-MM-DD. */
export function isBusinessDate(date: string | undefined): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  return parse(date).toISOString().slice(0, 10) === date
}

export function addDays(date: string, days: number) {
  const next = parse(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

/** Signed whole days from `from` to `to`. */
export const daysBetween = (from: string, to: string) =>
  Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS)

/** Business-date range of a period; `today` is the current business day. */
export function resolvePeriod(period: PeriodInput, today: string): DateRange {
  if (period.preset === 'today') return { from: today, to: today }
  if (period.preset === '7') return { from: addDays(today, -6), to: today }
  if (period.preset === '30') return { from: addDays(today, -29), to: today }
  const { from, to } = period
  if (!isBusinessDate(from) || !isBusinessDate(to)) {
    throw new AppError('invalid', 'Elige fechas válidas para el periodo.')
  }
  if (from > to) {
    throw new AppError(
      'invalid',
      'La fecha inicial no puede ser posterior a la final.',
    )
  }
  if (daysBetween(from, to) >= MAX_DAYS) {
    throw new AppError('invalid', 'El periodo no puede ser mayor a un año.')
  }
  return { from, to }
}

export const rangeLabel = (range: DateRange) =>
  range.from === range.to ? range.from : `${range.from} al ${range.to}`

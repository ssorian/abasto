import { businessDate } from '#/lib/utils/format'

import type { DateRange, PeriodMode } from '#/modules/reports/types/reports'

const DAY_MS = 86_400_000

/** Parses a business date at noon UTC so day arithmetic never crosses a boundary. */
const parse = (date: string) => new Date(`${date}T12:00:00Z`)
const toIso = (date: Date) => date.toISOString().slice(0, 10)

export function isValidDate(date: string) {
  return Number.isFinite(parse(date).getTime())
}

export function addDays(date: string, days: number) {
  const next = parse(date)
  next.setUTCDate(next.getUTCDate() + days)
  return toIso(next)
}

/** Whole days between two business dates, never negative. */
export function dayDistance(from: string, to: string) {
  return Math.max(
    0,
    Math.floor((parse(to).getTime() - parse(from).getTime()) / DAY_MS),
  )
}

/** Day, Monday-to-Sunday week or calendar month that contains the reference date. */
export function periodRange(mode: PeriodMode, reference: string): DateRange {
  const start = parse(isValidDate(reference) ? reference : businessDate())
  let end = new Date(start)

  if (mode === 'weekly') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
    end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
  }

  if (mode === 'monthly') {
    start.setUTCDate(1)
    end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 12),
    )
  }

  return { from: toIso(start), to: toIso(end) }
}

/** Moves the reference date one period back (-1) or forward (1). */
export function shiftReference(
  mode: PeriodMode,
  reference: string,
  amount: number,
) {
  const next = parse(reference)

  if (mode === 'monthly') {
    next.setUTCDate(1)
    next.setUTCMonth(next.getUTCMonth() + amount)
  } else {
    next.setUTCDate(next.getUTCDate() + amount * (mode === 'weekly' ? 7 : 1))
  }

  return toIso(next)
}

export function rangeLabel(range: DateRange) {
  return range.from === range.to ? range.from : `${range.from} al ${range.to}`
}

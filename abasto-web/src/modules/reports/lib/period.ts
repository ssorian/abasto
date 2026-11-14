import { AppError } from '#/lib/errors'
import type {
  DateRange,
  PeriodInput,
  PeriodPreset,
} from '#/modules/reports/types/reports'

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
  if (period.preset !== 'custom') {
    return presetRange(period.preset, anchorOf(period, today))
  }
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

/** The day a preset ends on: today, or a past day asked through `anchor`. */
function anchorOf(period: PeriodInput, today: string) {
  if (period.anchor === undefined) return today
  if (!isBusinessDate(period.anchor) || period.anchor > today) {
    throw new AppError('invalid', 'Elige fechas válidas para el periodo.')
  }
  return period.anchor
}

function presetRange(
  preset: Exclude<PeriodPreset, 'custom'>,
  end: string,
): DateRange {
  if (preset === 'today') return { from: end, to: end }
  if (preset === '7') return { from: addDays(end, -6), to: end }
  if (preset === '30') return { from: addDays(end, -29), to: end }
  if (preset === 'month') return { from: `${end.slice(0, 8)}01`, to: end }
  // Calendar week: Monday is the first day.
  const sinceMonday = (parse(end).getUTCDay() + 6) % 7
  return { from: addDays(end, -sinceMonday), to: end }
}

/**
 * The period a range is compared with. A calendar week compares with the same
 * days of the week before; a calendar month with the same days of the month
 * before (clamped to its length); anything else with the period of equal
 * length that ends the day before the range starts.
 */
export function comparisonRange(
  preset: PeriodPreset,
  range: DateRange,
): DateRange {
  if (preset === 'week') {
    return { from: addDays(range.from, -7), to: addDays(range.to, -7) }
  }
  if (preset === 'month') {
    const lastOfPrevious = addDays(`${range.from.slice(0, 8)}01`, -1)
    const day =
      range.to.slice(8) < lastOfPrevious.slice(8)
        ? range.to.slice(8)
        : lastOfPrevious.slice(8)
    const month = lastOfPrevious.slice(0, 8)
    return { from: `${month}01`, to: `${month}${day}` }
  }
  const days = daysBetween(range.from, range.to) + 1
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) }
}

export const rangeLabel = (range: DateRange) =>
  range.from === range.to ? range.from : `${range.from} al ${range.to}`

const MONTHS = [
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

/**
 * Range in long Spanish form: "6 al 12 nov 2026". Pass `knownYear` to drop the
 * year when the range sits entirely in it (the comparison next to the main range).
 */
export function longRangeLabel(range: DateRange, knownYear?: number) {
  const [fromYear, fromMonth, fromDay] = range.from.split('-').map(Number)
  const [toYear, toMonth, toDay] = range.to.split('-').map(Number)
  const month = (value: number) => MONTHS[value - 1]
  const sameYears = fromYear === toYear
  const tail = (year: number) => (year === knownYear ? '' : ` ${year}`)
  if (range.from === range.to) {
    return `${toDay} ${month(toMonth)}${tail(toYear)}`
  }
  if (sameYears && fromMonth === toMonth) {
    return `${fromDay} al ${toDay} ${month(toMonth)}${tail(toYear)}`
  }
  if (sameYears) {
    return `${fromDay} ${month(fromMonth)} al ${toDay} ${month(toMonth)}${tail(toYear)}`
  }
  return `${fromDay} ${month(fromMonth)} ${fromYear} al ${toDay} ${month(toMonth)} ${toYear}`
}

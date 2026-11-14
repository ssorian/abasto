import type { DailyPoint } from '#/modules/reports/lib/owner-series'
import { addDays, longRangeLabel } from '#/modules/reports/lib/period'
import type { DateRange, PeriodPreset } from '#/modules/reports/types/reports'

const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

// Noon UTC keeps the weekday stable whatever the browser time zone is.
const weekdayOf = (date: string) =>
  weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()]

/** "2026-11-09" → "Lun 9". */
export const weekdayLabel = (date: string) =>
  `${weekdayOf(date)} ${Number(date.slice(8))}`

/** "2026-11-09" → "Noviembre 2026". */
export const monthLabel = (date: string) =>
  `${monthNames[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`

/** Title of the period column, worded after the preset the owner chose. */
export function periodHeading(preset: PeriodPreset, range: DateRange) {
  if (preset === 'week') return `Semana del ${longRangeLabel(range)}`
  if (preset === 'month') {
    return `${monthLabel(range.from)}, al día ${Number(range.to.slice(8))}`
  }
  if (preset === 'today') {
    return `Hoy, ${weekdayOf(range.to).toLowerCase()} ${longRangeLabel(range)}`
  }
  return range.from === range.to
    ? longRangeLabel(range)
    : `Del ${longRangeLabel(range)}`
}

/** What the period is compared with: "semana anterior". */
export function comparisonNoun(preset: PeriodPreset) {
  if (preset === 'week') return 'semana anterior'
  if (preset === 'month') return 'mes anterior'
  if (preset === 'today') return 'día anterior'
  return 'periodo anterior'
}

/** Part of a total in basis points; zero when there is no total. */
export const shareBps = (part: number, total: number) =>
  total > 0 ? Math.round((part * 10_000) / total) : 0

export type ChartDay = {
  day: string
  label: string
  revenueCents: number
  /** Height against the best day of the period, 0 to 100. */
  heightPercent: number
  /** `future`: a day of the calendar week or month that has not happened. */
  state: 'sold' | 'zero' | 'future'
  today: boolean
}

function lastDayOf(preset: PeriodPreset, lastDay: string) {
  if (preset === 'week') {
    const weekday = new Date(`${lastDay}T12:00:00Z`).getUTCDay()
    return addDays(lastDay, (7 - weekday) % 7)
  }
  if (preset === 'month') {
    const [year, month] = lastDay.split('-').map(Number)
    const length = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return `${lastDay.slice(0, 8)}${String(length).padStart(2, '0')}`
  }
  return lastDay
}

/**
 * Bars of "Ventas por día". A calendar week or month is drawn whole, so the
 * days still to come show as empty slots instead of a shorter chart.
 */
export function chartDays(
  preset: PeriodPreset,
  days: ReadonlyArray<DailyPoint>,
  today: string,
): Array<ChartDay> {
  const last = days.at(-1)
  if (!last) return []
  const best = Math.max(...days.map((point) => point.revenueCents), 0)
  const label = (day: string) => {
    // A month has too many bars for words: the day number, today in bold.
    if (preset === 'month') return String(Number(day.slice(8)))
    return day === today ? 'Hoy' : weekdayLabel(day)
  }
  const bars: Array<ChartDay> = days.map((point) => ({
    day: point.day,
    label: label(point.day),
    revenueCents: point.revenueCents,
    heightPercent:
      best > 0 ? Math.round((Math.max(point.revenueCents, 0) * 100) / best) : 0,
    state: point.revenueCents > 0 ? 'sold' : 'zero',
    today: point.day === today,
  }))
  const end = lastDayOf(preset, last.day)
  for (let day = addDays(last.day, 1); day <= end; day = addDays(day, 1)) {
    bars.push({
      day,
      label: label(day),
      revenueCents: 0,
      heightPercent: 0,
      state: 'future',
      today: false,
    })
  }
  return bars
}

import { monthLabel, weekdayLabel } from '#/modules/reports/lib/owner-view'
import type { PdfKind } from '#/modules/reports/lib/pdf-report'
import { addDays, longRangeLabel } from '#/modules/reports/lib/period'
import type { PeriodInput } from '#/modules/reports/types/reports'

export type PdfChoice = {
  id: string
  kind: PdfKind
  label: string
  /** The dates the report covers, shown beside the label. */
  hint: string
  period: PeriodInput
}

/** Monday of the week `date` falls in. */
const mondayOf = (date: string) =>
  addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7))

/**
 * Reports offered for download: the day, week and month in course, then the
 * ones just closed, which is when a weekly or monthly report is usually filed.
 */
export function pdfChoices(today: string): Array<PdfChoice> {
  const monday = mondayOf(today)
  const monthStart = `${today.slice(0, 8)}01`
  const yesterday = addDays(today, -1)
  const lastSunday = addDays(monday, -1)
  const lastMonthEnd = addDays(monthStart, -1)
  const year = Number(today.slice(0, 4))
  return [
    {
      id: 'day',
      kind: 'day',
      label: 'Día',
      hint: weekdayLabel(today),
      period: { preset: 'today' },
    },
    {
      id: 'week',
      kind: 'week',
      label: 'Semana',
      hint: longRangeLabel({ from: monday, to: today }, year),
      period: { preset: 'week' },
    },
    {
      id: 'month',
      kind: 'month',
      label: 'Mes',
      hint: monthLabel(today),
      period: { preset: 'month' },
    },
    {
      id: 'yesterday',
      kind: 'day',
      label: 'Ayer',
      hint: weekdayLabel(yesterday),
      period: { preset: 'today', anchor: yesterday },
    },
    {
      id: 'last-week',
      kind: 'week',
      label: 'Semana pasada',
      hint: longRangeLabel({ from: addDays(monday, -7), to: lastSunday }, year),
      period: { preset: 'week', anchor: lastSunday },
    },
    {
      id: 'last-month',
      kind: 'month',
      label: 'Mes pasado',
      hint: monthLabel(lastMonthEnd),
      period: { preset: 'month', anchor: lastMonthEnd },
    },
  ]
}

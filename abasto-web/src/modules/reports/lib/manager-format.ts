import { businessTimeZone } from '#/modules/orders/services/clock'

const monthDay = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const weekday = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  timeZone: 'UTC',
})
const dayOfMonth = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  timeZone: 'UTC',
})

/** Noon UTC, so a business date never shifts to a neighbouring day. */
const at = (date: string) => new Date(`${date}T12:00:00Z`)

/** "12 nov" for a YYYY-MM-DD business date. */
export const shortDate = (date: string) =>
  monthDay.format(at(date)).replace('.', '')

/** "lun 2": weekday and day of month, for chart axes. */
export const dayAxisLabel = (date: string) =>
  `${weekday.format(at(date)).replace('.', '')} ${dayOfMonth.format(at(date))}`

const clock = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: businessTimeZone,
})

/** "08:20" in the business time zone. */
export const timeLabel = (date: Date) => clock.format(new Date(date))

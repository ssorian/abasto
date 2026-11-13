const formatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** A business day (YYYY-MM-DD) as "jueves 12 de noviembre". */
export const longDate = (day: string) =>
  formatter.format(new Date(`${day}T12:00:00Z`)).replace(',', '')

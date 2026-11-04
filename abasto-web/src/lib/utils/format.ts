const BUSINESS_TIME_ZONE = 'America/Mexico_City'

/** Business day in Mexico City as YYYY-MM-DD. */
export function businessDate(date: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

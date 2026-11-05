let override: (() => Date) | null = null

/** Current time for order timestamps and expiry; tests replace it with `useClock`. */
export const now = () => (override ? override() : new Date())

/** Replaces the clock (tests only); pass `null` to restore the real one. */
export function useClock(clock: (() => Date) | null) {
  override = clock
}

/** Time zone of the warehouses; lot expiry dates are calendar days there. */
export const businessTimeZone = 'America/Mexico_City'

/** Today's calendar date (YYYY-MM-DD) in the business time zone. */
export const businessDate = (at: Date = now()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)

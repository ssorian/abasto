/** Cents as the pesos text the money field accepts: 43850 → "438.50". */
export function exactAmountText(cents: number): string {
  const whole = Math.floor(cents / 100)
  const fraction = String(cents % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

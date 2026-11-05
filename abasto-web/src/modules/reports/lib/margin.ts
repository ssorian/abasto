/** Margin over revenue as a percent; null when there is no revenue to compare. */
export const marginPercent = (marginCents: number, revenueCents: number) =>
  revenueCents > 0 ? (marginCents * 100) / revenueCents : null

/** "84.6 %" or an em dash when there is no revenue. */
export function formatMargin(marginCents: number, revenueCents: number) {
  const value = marginPercent(marginCents, revenueCents)
  return value === null ? '—' : `${value.toFixed(1)} %`
}

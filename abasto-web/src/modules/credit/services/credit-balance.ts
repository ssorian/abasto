export type BalanceEntry = {
  type: 'charge' | 'abono'
  amountCents: number
  /** Business calendar day (YYYY-MM-DD) of a charge. */
  dueOn: string | null
}

export const balanceOf = (entries: ReadonlyArray<BalanceEntry>) =>
  entries.reduce(
    (sum, { type, amountCents }) =>
      sum + (type === 'charge' ? amountCents : -amountCents),
    0,
  )

/**
 * Cents of charges due before `today` and not covered. Abonos are applied to
 * the charges oldest first (the order of `entries`), whatever their due date.
 */
export function overdueOf(
  entries: ReadonlyArray<BalanceEntry>,
  today: string,
): number {
  let paid = entries
    .filter((entry) => entry.type === 'abono')
    .reduce((sum, entry) => sum + entry.amountCents, 0)
  let overdue = 0
  for (const entry of entries) {
    if (entry.type !== 'charge') continue
    const covered = Math.min(paid, entry.amountCents)
    paid -= covered
    if (entry.dueOn !== null && entry.dueOn < today) {
      overdue += entry.amountCents - covered
    }
  }
  return overdue
}

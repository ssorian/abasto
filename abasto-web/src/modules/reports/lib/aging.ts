import { daysBetween } from '#/modules/reports/lib/period'
import type { AgingRow } from '#/modules/reports/types/reports'

type Entry = {
  type: 'charge' | 'abono'
  amountCents: number
  dueOn: string | null
}

export type AgingBuckets = Omit<AgingRow, 'customerId' | 'name'>

/**
 * Splits what a customer still owes by days overdue on `today`. Abonos cover
 * the charges oldest first (the order of `entries`), whatever their due date,
 * the same rule as the customer's overdue balance.
 */
export function ageEntries(
  entries: ReadonlyArray<Entry>,
  today: string,
): AgingBuckets {
  let paid = entries
    .filter((entry) => entry.type === 'abono')
    .reduce((sum, entry) => sum + entry.amountCents, 0)
  const buckets: AgingBuckets = {
    currentCents: 0,
    days1to30Cents: 0,
    days31to60Cents: 0,
    over60Cents: 0,
    totalCents: 0,
  }
  for (const entry of entries) {
    if (entry.type !== 'charge' || entry.dueOn === null) continue
    const covered = Math.min(paid, entry.amountCents)
    paid -= covered
    const open = entry.amountCents - covered
    if (open === 0) continue
    const overdue = daysBetween(entry.dueOn, today)
    if (overdue <= 0) buckets.currentCents += open
    else if (overdue <= 30) buckets.days1to30Cents += open
    else if (overdue <= 60) buckets.days31to60Cents += open
    else buckets.over60Cents += open
    buckets.totalCents += open
  }
  return buckets
}

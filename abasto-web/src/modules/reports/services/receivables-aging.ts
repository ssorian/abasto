import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { customerLedger } from '#/modules/credit/db/schema'
import { customers } from '#/modules/customers/db/schema'
import { businessDate } from '#/modules/orders/services/clock'
import { ageEntries } from '#/modules/reports/lib/aging'
import { notAllowed } from '#/modules/reports/services/report-scope'
import type {
  AgingRow,
  AgingTotals,
  ReceivablesAging,
} from '#/modules/reports/types/reports'

/** Receivables are company-wide (S4): the owner and managers of any warehouse read them. */
export function canReadReceivables(actor: Actor) {
  return (
    actor.role === 'owner' ||
    [...actor.assignments.keys()].some((id) =>
      can(actor, 'warehouse.manage', id),
    )
  )
}

const emptyTotals = (): AgingTotals => ({
  customers: 0,
  currentCents: 0,
  days1to30Cents: 0,
  days31to60Cents: 0,
  over60Cents: 0,
  totalCents: 0,
})

/**
 * What each customer owes, split by days overdue (current, 1–30, 31–60,
 * over 60). Abonos cover the oldest charges first. Customers who owe nothing
 * are left out; the biggest balance comes first.
 */
export async function getReceivablesAging(
  actor: Actor,
): Promise<ReceivablesAging> {
  if (!canReadReceivables(actor)) throw notAllowed()
  const asOf = businessDate()
  const entries = await db
    .select({
      customerId: customerLedger.customerId,
      name: customers.name,
      type: customerLedger.type,
      amountCents: customerLedger.amountCents,
      dueOn: customerLedger.dueOn,
    })
    .from(customerLedger)
    .innerJoin(customers, eq(customers.id, customerLedger.customerId))
    .orderBy(asc(customerLedger.seq))
  const byCustomer = new Map<string, { name: string; list: typeof entries }>()
  for (const entry of entries) {
    const group = byCustomer.get(entry.customerId) ?? {
      name: entry.name,
      list: [],
    }
    group.list.push(entry)
    byCustomer.set(entry.customerId, group)
  }
  const rows = [...byCustomer].flatMap(([customerId, { name, list }]) => {
    const buckets = ageEntries(list, asOf)
    return buckets.totalCents > 0 ? [{ customerId, name, ...buckets }] : []
  })
  rows.sort(
    (a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name),
  )
  const totals = rows.reduce<AgingTotals>(
    (sum, row: AgingRow) => ({
      customers: sum.customers + 1,
      currentCents: sum.currentCents + row.currentCents,
      days1to30Cents: sum.days1to30Cents + row.days1to30Cents,
      days31to60Cents: sum.days31to60Cents + row.days31to60Cents,
      over60Cents: sum.over60Cents + row.over60Cents,
      totalCents: sum.totalCents + row.totalCents,
    }),
    emptyTotals(),
  )
  return { asOf, rows, totals }
}

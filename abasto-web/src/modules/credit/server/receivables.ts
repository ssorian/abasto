import { asc } from 'drizzle-orm'
import { db } from '#/db'
import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { getOpenCashSession } from '#/modules/cash/services/cash-sessions'
import { customerLedger } from '#/modules/credit/db/schema'
import { allocateCharges } from '#/modules/credit/lib/collections'
import type { AbonoRow, ChargeRow } from '#/modules/credit/lib/collections'
import { sortReceivables } from '#/modules/credit/lib/statement'
import { balanceOf, overdueOf } from '#/modules/credit/services/credit-balance'
import { listPendingCreditAuthorizations } from '#/modules/credit/services/credit-authorizations'
import type { LedgerEntry } from '#/modules/credit/services/customer-ledger'
import { listCustomers } from '#/modules/customers/services/customers'
import { businessDate } from '#/modules/orders/services/clock'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

export type ReceivableRow = {
  customerId: string
  name: string
  balanceCents: number
  overdueCents: number
  creditLimitCents: number
  termsDays: number
}

export type PendingRequest = {
  id: string
  orderId: string
  customerName: string
  amountCents: number
  warehouseName: string
  requestedAt: Date
}

export type ReceivablesOverview = {
  /** Warehouses the actor can operate (where an abono can be received). */
  warehouses: Array<{ id: string; name: string }>
  selectedId: string | null
  /** Whether the selected warehouse has an open drawer to receive cash. */
  drawerOpen: boolean
  customers: Array<ReceivableRow>
  /** Only the owner approves or rejects; staff get false and an empty list. */
  canAuthorize: boolean
  pending: Array<PendingRequest>
  /** Business day (YYYY-MM-DD) the overdue flags were computed for. */
  today: string
  /** Every credit order picked up by an active customer, paid or not. */
  charges: Array<ChargeRow>
  /** Abonos of active customers, newest first. */
  abonos: Array<AbonoRow>
}

/** Ledger entries per customer, each list in insertion order (oldest first). */
async function entriesByCustomer() {
  const grouped = new Map<string, Array<LedgerEntry>>()
  const entries = await db
    .select()
    .from(customerLedger)
    .orderBy(asc(customerLedger.seq))
  for (const entry of entries) {
    const list = grouped.get(entry.customerId) ?? []
    list.push(entry)
    grouped.set(entry.customerId, list)
  }
  return grouped
}

/**
 * Cobros: who owes what and on which credit order, the abonos received, the
 * selected warehouse's drawer, and the owner's pending requests.
 */
export async function getReceivables(
  actor: Actor,
  warehouseId?: string,
): Promise<ReceivablesOverview> {
  const allWarehouses = await listWarehouses(actor)
  const warehouses = allWarehouses.filter(({ id }) =>
    can(actor, 'warehouse.operate', id),
  )
  const selected =
    warehouses.find(({ id }) => id === warehouseId) ?? warehouses.at(0)
  const canAuthorize = can(actor, 'credit.authorize')
  const names = new Map(allWarehouses.map(({ id, name }) => [id, name]))
  const pending = canAuthorize
    ? (await listPendingCreditAuthorizations(actor)).map((request) => ({
        id: request.id,
        orderId: request.orderId,
        customerName: request.customerName,
        amountCents: request.amountCents,
        warehouseName: names.get(request.warehouseId) ?? '',
        requestedAt: request.requestedAt,
      }))
    : []
  const today = businessDate()
  // Without an operable warehouse the actor cannot receive abonos or read balances.
  if (!selected) {
    return {
      warehouses,
      selectedId: null,
      drawerOpen: false,
      customers: [],
      canAuthorize,
      pending,
      today,
      charges: [],
      abonos: [],
    }
  }
  const [active, session, ledger] = await Promise.all([
    listCustomers(actor, { active: true }),
    getOpenCashSession(actor, selected.id),
    entriesByCustomer(),
  ])
  // Staff only see the names of their own warehouses.
  const placeOf = (id: string | undefined) =>
    names.get(id ?? '') ?? 'Otro almacén'
  const charges: Array<ChargeRow> = []
  const abonos: Array<AbonoRow> = []
  const rows = active.map((customer) => {
    const entries = ledger.get(customer.id) ?? []
    const owner = { customerId: customer.id, customerName: customer.name }
    for (const charge of allocateCharges(entries, today)) {
      const entry = entries.find(({ id }) => id === charge.id)
      charges.push({
        ...charge,
        ...owner,
        warehouseName: placeOf(entry?.warehouseId),
      })
    }
    for (const entry of entries) {
      if (entry.type !== 'abono') continue
      abonos.push({
        id: entry.id,
        ...owner,
        warehouseName: placeOf(entry.warehouseId),
        amountCents: entry.amountCents,
        createdAt: entry.createdAt,
      })
    }
    return {
      customerId: customer.id,
      name: customer.name,
      balanceCents: balanceOf(entries),
      overdueCents: overdueOf(entries, today),
      creditLimitCents: customer.creditLimitCents,
      termsDays: customer.termsDays,
    }
  })
  return {
    warehouses,
    selectedId: selected.id,
    drawerOpen: session !== null,
    customers: sortReceivables(rows),
    canAuthorize,
    pending,
    today,
    charges,
    abonos: abonos.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
  }
}

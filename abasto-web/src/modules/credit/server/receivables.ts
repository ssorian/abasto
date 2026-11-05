import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { getOpenCashSession } from '#/modules/cash/services/cash-sessions'
import { sortReceivables } from '#/modules/credit/lib/statement'
import { listPendingCreditAuthorizations } from '#/modules/credit/services/credit-authorizations'
import { getCustomerBalance } from '#/modules/credit/services/customer-ledger'
import { listCustomers } from '#/modules/customers/services/customers'
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
}

/** Cobros: who owes what, the selected warehouse's drawer, and the owner's pending requests. */
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
  if (!selected) {
    return {
      warehouses,
      selectedId: null,
      drawerOpen: false,
      customers: [],
      canAuthorize,
      pending,
    }
  }
  const [active, session] = await Promise.all([
    listCustomers(actor, { active: true }),
    getOpenCashSession(actor, selected.id),
  ])
  const balances = await Promise.all(
    active.map((customer) => getCustomerBalance(actor, customer.id)),
  )
  return {
    warehouses,
    selectedId: selected.id,
    drawerOpen: session !== null,
    customers: sortReceivables(
      active.map((customer, index) => ({
        customerId: customer.id,
        name: customer.name,
        balanceCents: balances[index].balanceCents,
        overdueCents: balances[index].overdueCents,
        creditLimitCents: customer.creditLimitCents,
        termsDays: customer.termsDays,
      })),
    ),
    canAuthorize,
    pending,
  }
}

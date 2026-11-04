import { businessDate } from '#/lib/utils/format'
import { ALL, unregistered } from '#/modules/reports/lib/constants'

import type {
  EventAmounts,
  GroupMode,
  Reconciliation,
  SaleEvent,
  SalesGroup,
  SalesSummary,
} from '#/modules/reports/types/reports'

/** Signed amounts of one event: sales add, returns subtract. */
export function eventAmounts(event: SaleEvent): EventAmounts {
  const sign = event.type === 'Venta' ? 1 : -1
  const net = event.netCents

  return {
    gross: sign * event.grossCents,
    discount: sign * (event.grossCents - net),
    net: sign * net,
    cost: sign * event.costCents,
    profit: sign * (net - event.costCents),
    refund: event.type === 'Devolución' ? net : 0,
    quantity: sign * event.quantity,
  }
}

export function summarize(rows: ReadonlyArray<SaleEvent>): SalesSummary {
  let gross = 0
  let discount = 0
  let net = 0
  let cost = 0
  let refund = 0

  for (const event of rows) {
    const amounts = eventAmounts(event)
    gross += amounts.gross
    discount += amounts.discount
    net += amounts.net
    cost += amounts.cost
    refund += amounts.refund
  }

  cost = Math.round(cost) || 0
  const profit = net - cost

  return {
    gross,
    discount,
    net,
    cost,
    profit,
    refund,
    margin: net > 0 ? (profit / net) * 100 : null,
    orders: new Set(
      rows.filter((e) => e.type === 'Venta').map((e) => e.orderId),
    ).size,
    returns: new Set(
      rows.filter((e) => e.type === 'Devolución').map((e) => e.id),
    ).size,
  }
}

type SalesFilters = {
  from: string
  to: string
  warehouse: string
  product: string
  channel: string
}

/** Events inside the range and filters, newest first. */
export function filterSales(
  sales: ReadonlyArray<SaleEvent>,
  { from, to, warehouse, product, channel }: SalesFilters,
) {
  return sales
    .filter((event) => {
      const day = businessDate(new Date(event.date))
      return (
        day >= from &&
        day <= to &&
        (warehouse === ALL || event.warehouse === warehouse) &&
        (product === ALL || event.productId === product) &&
        (channel === ALL || (event.channel || unregistered) === channel)
      )
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

function groupKey(event: SaleEvent, mode: GroupMode) {
  if (mode === 'lot')
    return `${event.receiptId}|${event.productId}|${event.warehouse}`
  if (mode === 'warehouse') return event.warehouse
  if (mode === 'channel') return event.channel || unregistered
  return event.productId
}

function groupName(event: SaleEvent, mode: GroupMode) {
  if (mode === 'lot')
    return `${event.productName} · ${event.lot || 'Sin lote'} · ${event.warehouse}`
  if (mode === 'warehouse') return event.warehouse
  if (mode === 'channel') return event.channel || unregistered
  return event.productName
}

function netUnits(rows: ReadonlyArray<SaleEvent>) {
  const byUnit = new Map<string, number>()
  for (const event of rows) {
    const signed = event.type === 'Venta' ? event.quantity : -event.quantity
    byUnit.set(event.unit, (byUnit.get(event.unit) ?? 0) + signed)
  }
  return [...byUnit]
    .map(([unit, quantity]) => `${quantity} ${unit}`)
    .join(' · ')
}

/** Groups events and orders the groups by net sales, highest first. */
export function groupSales(
  rows: ReadonlyArray<SaleEvent>,
  mode: GroupMode,
): Array<SalesGroup> {
  const groups = new Map<string, { name: string; rows: Array<SaleEvent> }>()

  for (const event of rows) {
    const key = groupKey(event, mode)
    const group = groups.get(key) ?? { name: groupName(event, mode), rows: [] }
    group.rows.push(event)
    groups.set(key, group)
  }

  return [...groups]
    .map(([key, group]) => ({
      key,
      ...group,
      summary: summarize(group.rows),
      units: netUnits(group.rows),
    }))
    .sort((a, b) => b.summary.net - a.summary.net)
}

/** The three figures that explain net sales: gross, discounts and refunds. */
export function reconcile(
  rows: ReadonlyArray<SaleEvent>,
  summary: SalesSummary,
): Reconciliation {
  const returnedGross = rows
    .filter((e) => e.type === 'Devolución')
    .reduce((sum, e) => sum - eventAmounts(e).gross, 0)

  return {
    beforeDiscounts: summary.gross + returnedGross,
    discounts: rows
      .filter((e) => e.type === 'Venta')
      .reduce((sum, e) => sum + eventAmounts(e).discount, 0),
    refunds: summary.refund,
  }
}

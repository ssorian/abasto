import { minimumMarginPct } from '#/modules/counter/lib/constants'
import {
  allocationMargin,
  orderAllocations,
} from '#/modules/counter/lib/amounts'
import { formatMoney } from '#/modules/counter/lib/money'

import type { CounterState } from '#/modules/counter/types/counter'

export type OperationChange = {
  entity: string
  detail: string
  before?: string
  after?: string
}

export type OperationReview = {
  changes: Array<OperationChange>
  risks: Array<string>
  /** Sensitive operations ask for a recorded reason before they are applied. */
  needsReason: boolean
}

/** Compares two states and lists what changed and which changes are sensitive. */
export function reviewOperation(
  before: CounterState,
  after: CounterState,
): OperationReview {
  const changes: Array<OperationChange> = []
  const risks = new Set<string>()
  const isNew = <T extends { id: string }>(list: Array<T>, item: T) =>
    !list.some((x) => x.id === item.id)

  for (const order of after.orders) {
    const old = before.orders.find((o) => o.id === order.id)
    if (!old) {
      changes.push({
        entity: 'Ventas',
        detail: `${order.channel} · ${order.customer} · ${order.lines.map((l) => l.soldAs).join(', ')}`,
      })
      const low = order.lines.flatMap((line) =>
        line.allocations
          .filter((a) => allocationMargin(a) + 1e-7 < minimumMarginPct)
          .map(
            (a) =>
              `${line.productName} · ${a.lot}: ${allocationMargin(a).toFixed(1)}%`,
          ),
      )
      if (low.length) {
        risks.add(
          `Venta bajo margen mínimo (${minimumMarginPct}%): ${low.join('; ')}`,
        )
      }
    } else if (JSON.stringify(old) !== JSON.stringify(order)) {
      changes.push({
        entity: 'Ventas',
        detail: order.customer,
        before: old.status,
        after: order.status,
      })
      const cancelled = (o: typeof order) =>
        orderAllocations(o).reduce((sum, a) => sum + a.cancelled, 0)
      if (
        (order.status === 'Cancelado' && old.status !== 'Cancelado') ||
        cancelled(order) > cancelled(old)
      ) {
        risks.add('Cancelación de cantidades')
      }
    }
  }

  for (const m of after.movements.filter((x) => isNew(before.movements, x))) {
    changes.push({
      entity: 'Inventario',
      detail: `${m.type} · ${m.productName} · ${m.qty > 0 ? '+' : ''}${m.qty} unidades · ${m.warehouse}`,
    })
    if (m.type === 'Devolución')
      risks.add('Ajuste, baja o devolución de inventario')
  }

  for (const p of after.payments.filter((x) => isNew(before.payments, x))) {
    changes.push({
      entity: 'Cobros',
      detail: `${p.type} · ${p.method} · ${formatMoney(p.amountCents)} · ${p.orderId}`,
    })
    if (p.type === 'Reembolso') risks.add('Reembolso de dinero')
  }

  for (const c of after.cashSessions) {
    const old = before.cashSessions.find((x) => x.id === c.id)
    if (!old) {
      changes.push({
        entity: 'Caja',
        detail: `Apertura · ${c.warehouse} · ${c.cashier} · Fondo ${formatMoney(c.openingCents)}`,
      })
    } else if (old.status !== c.status) {
      changes.push({
        entity: 'Caja',
        detail: `Cierre · ${c.warehouse}`,
        before: `Esperado ${formatMoney(c.expectedCents ?? 0)}`,
        after: `Contado ${formatMoney(c.countedCents ?? 0)} · Diferencia ${formatMoney(c.differenceCents ?? 0)}`,
      })
      if (c.differenceCents) risks.add('Cierre con diferencia de efectivo')
    }
  }

  for (const m of after.cashMovements.filter((x) =>
    isNew(before.cashMovements, x),
  )) {
    changes.push({
      entity: 'Caja',
      detail: `${m.type} ${formatMoney(m.amountCents)} · ${m.reason}`,
    })
    if (m.type === 'Retiro') risks.add('Retiro de efectivo')
  }

  if (!changes.length) throw new Error('No hay cambios que registrar.')
  return { changes, risks: [...risks], needsReason: risks.size > 0 }
}

import { StatusBadge } from '#/components/status-badge'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  formatPickupDate,
  orderStatusTone,
  storeOrderCode,
} from '#/modules/store/lib/store-labels'
import type { StoreOrder } from '#/modules/store/services/storefront'

/** Lines, total and pickup deadline of a reserved order. */
export function OrderSummary({ order }: { order: StoreOrder }) {
  const open = order.status === 'Reservado' || order.status === 'Preparado'
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[1.5px] text-ink-eyebrow">
            {storeOrderCode(order.id)}
          </p>
          <p className="text-sm text-ink-muted">
            Recoges en {order.warehouseName}
          </p>
        </div>
        <StatusBadge tone={orderStatusTone(order.status)}>
          {order.status}
        </StatusBadge>
      </div>

      <ul className="grid divide-y divide-row-border rounded-xl border border-panel-border bg-white">
        {order.lines.map((line, index) => (
          <li
            key={`${line.productName}-${line.presentationName}-${index}`}
            className="flex items-start justify-between gap-3 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-row">
                {line.productName}
              </p>
              <p className="text-[13px] text-ink-muted">
                {line.presentationName} · {line.quantity} ×{' '}
                {formatCents(line.unitPriceCents)}
              </p>
            </div>
            <p className="text-sm font-semibold text-ink-figure tabular-nums">
              {formatCents(line.lineTotalCents)}
            </p>
          </li>
        ))}
        <li className="flex items-center justify-between p-3">
          <span className="text-sm font-semibold text-ink-row">Total</span>
          <span className="text-lg font-bold text-ink-figure tabular-nums">
            {formatCents(order.totalCents)}
          </span>
        </li>
      </ul>

      {order.notes ? (
        <p className="text-sm text-ink-muted">Nota: {order.notes}</p>
      ) : null}

      <p className="text-sm text-ink-row">
        <span className="text-ink-muted">
          {open ? 'Recoge antes de' : 'Fecha límite era'}
        </span>{' '}
        <strong className="font-semibold">
          {formatPickupDate(order.expiresAt)}
        </strong>
      </p>
    </div>
  )
}

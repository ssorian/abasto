import { formatCents } from '#/modules/pricing/lib/money'
import { OrderStatusStrip } from '#/modules/store/components/order-status-strip'
import {
  formatPickupDate,
  storeOrderCode,
} from '#/modules/store/lib/store-labels'
import type { StoreOrder } from '#/modules/store/services/storefront'

/** Lines and total of an order, as ruled label lines. */
export function OrderLines({ order }: { order: StoreOrder }) {
  return (
    <ul className="grid divide-y divide-rb-rule border-y-2 border-rb-graphite">
      {order.lines.map((line, index) => (
        <li
          key={`${line.productName}-${line.presentationName}-${index}`}
          className="flex items-start justify-between gap-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-[15px] leading-tight font-semibold">
              {line.productName}
            </p>
            <p className="text-[14px] text-rb-muted">
              {line.presentationName} ·{' '}
              <span className="rb-num">{line.quantity}</span> ×{' '}
              <span className="rb-num">{formatCents(line.unitPriceCents)}</span>
            </p>
          </div>
          <span className="rb-num shrink-0 text-[17px]">
            {formatCents(line.lineTotalCents)}
          </span>
        </li>
      ))}
      <li className="flex items-baseline justify-between py-2.5">
        <span className="rb-label">Total</span>
        <span className="rb-num text-[26px]">
          {formatCents(order.totalCents)}
        </span>
      </li>
    </ul>
  )
}

export const isOpenOrder = (order: StoreOrder) =>
  order.status === 'Reservado' || order.status === 'Preparado'

/** One order on the orders page: code, status strip, lines and pickup deadline. */
export function OrderSummary({ order }: { order: StoreOrder }) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="rb-stencil text-[24px] leading-none">
          {storeOrderCode(order.id)}
        </p>
        <p className="mt-1 text-[14px] text-rb-muted">
          Recoges en {order.warehouseName}
        </p>
      </div>

      <OrderStatusStrip status={order.status} />
      <OrderLines order={order} />

      {order.notes ? (
        <p className="text-[14px] text-rb-muted">Nota: {order.notes}</p>
      ) : null}

      <p className="text-[15px]">
        <span className="text-rb-muted">
          {isOpenOrder(order) ? 'Recoge antes de' : 'Fecha límite era'}
        </span>{' '}
        <strong className="font-semibold">
          {formatPickupDate(order.expiresAt)}
        </strong>
      </p>
    </div>
  )
}

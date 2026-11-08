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
    <ul className="grid divide-y divide-st-line border-y border-st-line">
      {order.lines.map((line, index) => (
        <li
          key={`${line.productName}-${line.presentationName}-${index}`}
          className="flex items-start justify-between gap-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-[15px] leading-tight font-semibold">
              {line.productName}
            </p>
            <p className="text-[14px] text-st-muted">
              {line.presentationName} ·{' '}
              <span className="st-num">{line.quantity}</span> ×{' '}
              <span className="st-num">{formatCents(line.unitPriceCents)}</span>
            </p>
          </div>
          <span className="st-num shrink-0 text-[16px]">
            {formatCents(line.lineTotalCents)}
          </span>
        </li>
      ))}
      <li className="flex items-baseline justify-between py-2.5">
        <span className="st-card">Total</span>
        <span className="st-num text-[24px]">
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
        <p className="st-num text-[22px] leading-none text-st-plum-ink">
          {storeOrderCode(order.id)}
        </p>
        <p className="mt-1 text-[14px] text-st-muted">
          Recoges en {order.warehouseName}
        </p>
      </div>

      <OrderStatusStrip status={order.status} />
      <OrderLines order={order} />

      {order.notes ? (
        <p className="text-[14px] text-st-muted">Nota: {order.notes}</p>
      ) : null}

      <p className="text-[15px]">
        <span className="text-st-muted">
          {isOpenOrder(order) ? 'Recoge antes de' : 'Fecha límite era'}
        </span>{' '}
        <strong className="font-semibold">
          {formatPickupDate(order.expiresAt)}
        </strong>
      </p>
    </div>
  )
}

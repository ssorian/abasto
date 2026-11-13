import { OrderLines } from '#/modules/store/components/order-summary'
import {
  holdUntilLabel,
  storeOrderCode,
} from '#/modules/store/lib/store-labels'
import type { StoreOrder } from '#/modules/store/services/storefront'

/** Confirmation: the reservation as a hang tag with its code and deadline. */
export function ReservationTag({ order }: { order: StoreOrder }) {
  return (
    <div className="st-hangtag grid gap-4 px-4 pb-4">
      <div className="text-center">
        <p className="st-code text-[36px] leading-none text-st-plum-ink">
          {storeOrderCode(order.id)}
        </p>
        <p className="st-card mt-2">Apartado en {order.warehouseName}</p>
      </div>

      <div className="st-plate st-plate--brand p-3.5">
        <p className="st-stencil text-[20px] leading-tight text-st-brand-hover">
          {holdUntilLabel(order.expiresAt)}
        </p>
      </div>

      <p className="text-[15px] leading-snug">
        Listo, apartamos tu pedido. No pagaste nada: lo recoges y lo pagas en el
        almacén. Si no llegas a tiempo, el apartado vence.
      </p>

      <OrderLines order={order} />
    </div>
  )
}

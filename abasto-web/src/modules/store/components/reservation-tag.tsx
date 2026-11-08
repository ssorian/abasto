import { OrderLines } from '#/modules/store/components/order-summary'
import {
  formatPickupDate,
  storeOrderCode,
} from '#/modules/store/lib/store-labels'
import type { StoreOrder } from '#/modules/store/services/storefront'

/** Confirmation: the reservation as a hang tag with its code and deadline. */
export function ReservationTag({ order }: { order: StoreOrder }) {
  return (
    <div className="rb-hangtag grid gap-4 px-4 pb-4">
      <div className="text-center">
        <p className="rb-stencil text-[40px] leading-none">
          {storeOrderCode(order.id)}
        </p>
        <p className="rb-label mt-2">Apartado en {order.warehouseName}</p>
      </div>

      <div className="rb-plate p-3">
        <p className="text-[14px] font-medium">Recoge antes de</p>
        <p className="rb-stencil text-[22px] leading-tight">
          {formatPickupDate(order.expiresAt)}
        </p>
      </div>

      <p className="text-[15px] leading-snug font-medium">
        Listo, apartamos tu pedido. No pagaste nada: lo recoges y lo pagas en el
        almacén. Si no llegas a tiempo, el apartado vence.
      </p>

      <OrderLines order={order} />
    </div>
  )
}

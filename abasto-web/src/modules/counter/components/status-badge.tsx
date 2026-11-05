import { statusTone } from '#/modules/counter/lib/order-status'
import { cn } from '#/lib/utils/cn'
import type { OrderStatus } from '#/modules/orders/db/schema'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-1 text-xs font-[650]',
        statusTone(status),
      )}
    >
      {status}
    </span>
  )
}

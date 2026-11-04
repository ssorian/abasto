import { ArrowRight } from 'lucide-react'

import { StatusBadge } from '#/components/status-badge'
import { committedCents } from '#/modules/counter/lib/amounts'
import { formatMoney } from '#/modules/counter/lib/money'
import { ActionButton } from '#/modules/counter/components/action-button'

import type { Order } from '#/modules/counter/types/counter'

/** Summary card of one sale or delivery in the follow-up list. */
export function OrderCard({
  order,
  onOpen,
}: {
  order: Order
  onOpen: () => void
}) {
  const tone =
    order.status === 'Entregado'
      ? 'green'
      : order.status === 'Cancelado'
        ? 'gray'
        : 'blue'

  return (
    <article className="rounded-xl border border-[#dfe5ed] bg-white p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-xs text-[#657b96]">{order.id}</strong>
        <StatusBadge
          tone={tone}
          className="max-w-[155px] text-center whitespace-normal"
        >
          {order.status}
        </StatusBadge>
      </div>
      <h3 className="mt-5 text-xl font-[650] tracking-[-0.4px]">
        {order.customer}
      </h3>
      <p className="mt-1.5 text-sm text-[#788596]">
        {order.channel} · {order.warehouse} · {order.fulfillment}
      </p>
      <div className="my-5 border-y border-[#edf0f5] py-4">
        {order.lines.map((line) => (
          <div
            key={line.productId}
            className="flex justify-between gap-3 py-[7px] text-sm text-[#62778e]"
          >
            <span>{line.productName}</span>
            <b className="font-semibold whitespace-nowrap text-[#304e70]">
              {line.soldAs}
            </b>
          </div>
        ))}
      </div>
      <div className="my-[19px] flex items-center justify-between text-[13px] text-[#6d8098]">
        <span>Pedido vigente</span>
        <strong className="text-[23px] tracking-[-0.5px] text-[#173d6b]">
          {formatMoney(committedCents(order))}
        </strong>
      </div>
      <ActionButton className="w-full" onClick={onOpen}>
        Abrir operación <ArrowRight size={15} />
      </ActionButton>
    </article>
  )
}

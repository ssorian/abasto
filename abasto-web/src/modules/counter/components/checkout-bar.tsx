import { ArrowRight } from 'lucide-react'

import { formatMoney } from '#/modules/counter/lib/money'
import { ActionButton } from '#/modules/counter/components/action-button'

import type { OrderComposer } from '#/modules/counter/hooks/use-order-composer'

/** Dark total bar with the final action of the composer. */
export function CheckoutBar({ composer }: { composer: OrderComposer }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-5 rounded-[13px] border border-[#153966] bg-[#153966] p-[18px] md:flex-nowrap md:px-6 md:py-[22px]">
      <div>
        <span className="block text-xs text-[#bbcfe7]">
          {composer.lines.length} productos · Total MXN
        </span>
        <strong className="text-[28px] font-[650] tracking-[-0.7px] text-[#ffda58] md:text-[30px]">
          {formatMoney(composer.totalCents)}
        </strong>
        {composer.isCounter && (
          <small className="block text-xs text-[#bbcfe7]">
            Cobro: {formatMoney(composer.payCents)}
            {composer.method === 'Efectivo'
              ? ` · Cambio: ${formatMoney(Math.max(0, composer.changeCents))}`
              : ''}
          </small>
        )}
      </div>
      <ActionButton
        tone="primary"
        className="min-h-[46px] text-[#173963] max-md:w-full"
        disabled={!composer.canFinish}
        onClick={composer.finish}
      >
        {composer.isCounter ? 'Cobrar y entregar' : 'Confirmar y reservar'}
        <ArrowRight className="size-[17px]" />
      </ActionButton>
    </div>
  )
}

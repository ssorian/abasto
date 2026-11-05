import { ActionButton } from '#/modules/counter/components/action-button'
import { orderCode } from '#/modules/counter/lib/order-format'
import { receiptLines } from '#/modules/counter/lib/payment'
import type { PickupWithReceipt } from '#/modules/counter/server/pickup'

/** What the clerk hands over after a pickup: total, cash and change, or the credit charge. */
export function ReceiptView({
  result,
  customerName,
  onDone,
}: {
  result: PickupWithReceipt
  customerName: string
  onDone: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#503f45]">
        {orderCode(result.id)} · {customerName} · entregado
      </p>
      <dl className="grid grid-cols-2 gap-2 rounded-xl border border-[#f0eae3] bg-[#fcfaf8] p-4 text-sm">
        {receiptLines(result.totalCents, result.payment, result.dueOn).map(
          ([label, value]) => (
            <div key={label} className="contents">
              <dt>{label}</dt>
              <dd className="text-right font-[650]">{value}</dd>
            </div>
          ),
        )}
      </dl>
      <div className="flex justify-end">
        <ActionButton tone="primary" onClick={onDone}>
          Listo
        </ActionButton>
      </div>
    </div>
  )
}

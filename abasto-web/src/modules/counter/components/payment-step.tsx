import { useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { useOrderActions } from '#/modules/counter/hooks/use-order-actions'
import { drawerClosedNotice } from '#/modules/counter/lib/order-status'
import {
  changeFor,
  contadoPayment,
  quickCashAmounts,
} from '#/modules/counter/lib/payment'
import { cn } from '#/lib/utils/cn'
import { formatCents } from '#/modules/pricing/lib/money'
import type { PickupWithReceipt } from '#/modules/counter/server/pickup'
import type { OrderDetail } from '#/modules/orders/services/order-reads'

type PaymentStepProps = {
  order: OrderDetail
  /** Cash payments need the warehouse's drawer open. */
  drawerOpen: boolean
  onPaid: (result: PickupWithReceipt) => void
  onBack: () => void
}

/** Entregar: take the cash for the whole order, then deliver. */
export function PaymentStep({
  order,
  drawerOpen,
  onPaid,
  onBack,
}: PaymentStepProps) {
  const orders = useOrderActions()
  const [tendered, setTendered] = useState('')
  const [refusal, setRefusal] = useState<string>()
  const [busy, setBusy] = useState(false)

  const change = changeFor(order.totalCents, tendered)
  const payment = contadoPayment(order.totalCents, tendered)

  async function pay() {
    if (!payment.ok) return
    setRefusal(undefined)
    setBusy(true)
    const result = await orders.pickup(order.id, payment.value)
    setBusy(false)
    if (result.ok) onPaid(result.data)
    else setRefusal(result.message)
  }

  const cashReady = drawerOpen && payment.ok

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-[#f0eae3] bg-[#fcfaf8] p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (cashReady && !busy) void pay()
      }}
    >
      <h3 className="text-[17px] font-[650]">
        Cobrar {formatCents(order.totalCents)}
      </h3>
      {!drawerOpen && (
        <p className="text-sm text-[#a1372e]">{drawerClosedNotice}</p>
      )}
      <Field label="Efectivo recibido (pesos)">
        <FieldInput
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={tendered}
          onChange={(event) => setTendered(event.target.value)}
        />
      </Field>
      <div
        role="group"
        aria-label="Montos rápidos"
        className="flex flex-wrap gap-2"
      >
        {quickCashAmounts(order.totalCents).map(({ label, cents }) => (
          <ActionButton
            key={cents}
            type="button"
            className="min-h-10"
            onClick={() => setTendered((cents / 100).toFixed(2))}
          >
            {label}
          </ActionButton>
        ))}
      </div>
      {tendered.trim() && (
        <p
          className={cn(
            'text-sm font-[650]',
            !change.ok && 'font-normal text-[#a1372e]',
          )}
        >
          {change.ok
            ? `Cambio: ${formatCents(change.value.changeCents)}`
            : change.message}
        </p>
      )}
      {refusal && (
        <p role="alert" className="text-sm text-[#a1372e]">
          {refusal}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          tone="primary"
          type="submit"
          disabled={busy || !cashReady}
        >
          Cobrar y entregar
        </ActionButton>
        <ActionButton type="button" disabled={busy} onClick={onBack}>
          Volver
        </ActionButton>
      </div>
    </form>
  )
}

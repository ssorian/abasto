import { useEffect, useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { useOrderActions } from '#/modules/counter/hooks/use-order-actions'
import {
  changeFor,
  contadoPayment,
  creditRefusalNote,
} from '#/modules/counter/lib/payment'
import { useCreditActions } from '#/modules/credit/hooks/use-credit-actions'
import { cn } from '#/lib/utils/cn'
import { formatCents } from '#/modules/pricing/lib/money'
import type { PickupWithReceipt } from '#/modules/counter/server/pickup'
import type { CustomerBalance } from '#/modules/credit/services/customer-ledger'
import type { OrderDetail } from '#/modules/orders/services/order-reads'

type Terms = 'contado' | 'credito'

type PaymentStepProps = {
  order: OrderDetail
  /** Cash payments need the warehouse's drawer open. */
  drawerOpen: boolean
  onPaid: (result: PickupWithReceipt) => void
  onBack: () => void
}

function TermsButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border border-[#e8e1e3] bg-white px-4 py-2 text-[13px] text-[#866a73]',
        active && 'border-transparent bg-primary font-[650] text-brand-ink',
      )}
    >
      {children}
    </button>
  )
}

/** Entregar: pick how the whole order is paid (cash or credit), then deliver. */
export function PaymentStep({
  order,
  drawerOpen,
  onPaid,
  onBack,
}: PaymentStepProps) {
  const orders = useOrderActions()
  const credit = useCreditActions()
  const [terms, setTerms] = useState<Terms>('contado')
  const [tendered, setTendered] = useState('')
  const [balance, setBalance] = useState<CustomerBalance>()
  const [balanceError, setBalanceError] = useState<string>()
  const [refusal, setRefusal] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (terms !== 'credito' || balance) return
    credit.balance(order.customerId).then(setBalance, () => {
      setBalanceError('No pudimos cargar el saldo del cliente.')
    })
    // Loaded the first time credit is chosen.
  }, [terms])

  const change = changeFor(order.totalCents, tendered)
  const payment = contadoPayment(order.totalCents, tendered)

  async function pay() {
    const input =
      terms === 'credito'
        ? { terms: 'credito' as const }
        : payment.ok
          ? payment.value
          : null
    if (!input) return
    setRefusal(undefined)
    setBusy(true)
    const result = await orders.pickup(order.id, input)
    setBusy(false)
    if (result.ok) onPaid(result.data)
    else setRefusal(result.message)
  }

  const cashReady = drawerOpen && payment.ok
  const note = refusal ? creditRefusalNote(refusal) : null

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#f0eae3] bg-[#fcfaf8] p-4">
      <h3 className="text-[17px] font-[650]">
        Cobrar {formatCents(order.totalCents)}
      </h3>
      <div role="group" aria-label="Forma de pago" className="flex gap-2">
        <TermsButton
          active={terms === 'contado'}
          onClick={() => setTerms('contado')}
        >
          Contado
        </TermsButton>
        <TermsButton
          active={terms === 'credito'}
          onClick={() => setTerms('credito')}
        >
          Crédito
        </TermsButton>
      </div>
      {terms === 'contado' ? (
        <>
          {!drawerOpen && (
            <p className="text-sm text-[#a1372e]">
              Abre la caja antes de cobrar.
            </p>
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
        </>
      ) : (
        <div className="text-sm leading-[1.8] text-[#503f45]">
          {balanceError && <p className="text-[#a1372e]">{balanceError}</p>}
          {!balance && !balanceError && <p>Cargando saldo…</p>}
          {balance && !balance.creditEnabled && (
            <p className="text-[#a1372e]">
              Este cliente no tiene crédito habilitado.
            </p>
          )}
          {balance?.creditEnabled && (
            <ul>
              <li>Saldo actual: {formatCents(balance.balanceCents)}</li>
              <li>
                Límite de crédito: {formatCents(balance.creditLimitCents)}
              </li>
              <li>
                Vencido:{' '}
                {balance.overdueCents > 0
                  ? formatCents(balance.overdueCents)
                  : 'nada vencido'}
              </li>
              <li>Plazo: {balance.termsDays} días</li>
              {(balance.overdueCents > 0 ||
                balance.balanceCents + order.totalCents >
                  balance.creditLimitCents) && (
                <li className="font-[650] text-[#a1372e]">
                  Este pedido necesita la autorización del dueño.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
      {refusal && (
        <div role="alert" className="text-sm text-[#a1372e]">
          <p>{refusal}</p>
          {note && <p className="mt-1 font-[650]">{note}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          tone="primary"
          disabled={busy || (terms === 'contado' ? !cashReady : !balance)}
          onClick={pay}
        >
          {terms === 'contado'
            ? 'Cobrar y entregar'
            : 'Cargar a crédito y entregar'}
        </ActionButton>
        <ActionButton disabled={busy} onClick={onBack}>
          Volver
        </ActionButton>
      </div>
    </div>
  )
}

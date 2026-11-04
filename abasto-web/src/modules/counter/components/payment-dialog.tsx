import { useState } from 'react'

import { committedCents, paidCents } from '#/modules/counter/lib/amounts'
import { paymentMethods } from '#/modules/counter/lib/constants'
import { formatMoney, isValidMoney, toCents } from '#/modules/counter/lib/money'
import { addPayment } from '#/modules/counter/lib/orders'
import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/counter/components/form-controls'
import { SectionHelp } from '#/modules/counter/components/info-banner'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type {
  CounterState,
  Order,
  PaymentMethod,
} from '#/modules/counter/types/counter'

/** Register money received (or refunded) against an order balance. */
export function PaymentDialog({
  state,
  order,
  apply,
  onDone,
}: {
  state: CounterState
  order: Order
  apply: ApplyOperation
  onDone: () => void
}) {
  const balance = committedCents(order) - paidCents(state, order.id)
  const type = balance < 0 ? 'Reembolso' : 'Cobro'
  const [amount, setAmount] = useState(String(Math.abs(balance) / 100))
  const [method, setMethod] = useState<PaymentMethod>('Efectivo')
  const [reference, setReference] = useState('')
  const [tendered, setTendered] = useState('')

  return (
    <CounterDialog
      title={type === 'Cobro' ? 'Registrar cobro' : 'Devolver saldo a favor'}
      description={`${order.id} · ${order.customer} · ${type === 'Cobro' ? 'Pendiente' : 'Saldo a favor'} ${formatMoney(Math.abs(balance))}`}
      onClose={onDone}
    >
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        <Field label="Importe">
          <FieldInput
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="Medio">
          <FieldSelect
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {paymentMethods.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </FieldSelect>
        </Field>
        {method === 'Efectivo' && type === 'Cobro' && (
          <Field label="Efectivo recibido">
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              placeholder={amount}
              value={tendered}
              onChange={(event) => setTendered(event.target.value)}
            />
          </Field>
        )}
        <Field
          label={
            method === 'Efectivo'
              ? 'Nota (opcional)'
              : 'Referencia de pago confirmado'
          }
        >
          <FieldInput
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
      </div>
      <SectionHelp>
        Registra únicamente dinero recibido o reembolsado. Este movimiento no
        genera una venta adicional.
      </SectionHelp>
      <ActionButton
        tone="primary"
        className="self-start"
        onClick={() => {
          if (
            apply((current) => {
              const value = Number(amount)
              if (!isValidMoney(value) || value <= 0) {
                throw new Error(
                  'Ingresa un importe positivo con hasta dos decimales.',
                )
              }
              return addPayment(
                current,
                order.id,
                type,
                method,
                toCents(value),
                reference,
                tendered ? toCents(Number(tendered)) : toCents(value),
                new Date().toISOString(),
              )
            }, `${type} registrado.`)
          ) {
            onDone()
          }
        }}
      >
        Confirmar {type.toLowerCase()}
      </ActionButton>
    </CounterDialog>
  )
}

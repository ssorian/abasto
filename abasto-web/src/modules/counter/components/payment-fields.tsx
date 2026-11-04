import { paymentMethods } from '#/modules/counter/lib/constants'
import {
  CheckboxField,
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/counter/components/form-controls'
import { formGrid } from '#/modules/counter/components/composer-fields'
import { SectionHelp } from '#/modules/counter/components/info-banner'

import type { OrderComposer } from '#/modules/counter/hooks/use-order-composer'
import type { PaymentMethod } from '#/modules/counter/types/counter'

/** Payment method, tendered cash or reference, and the lot verification check. */
export function PaymentFields({ composer }: { composer: OrderComposer }) {
  return (
    <>
      <div className={formGrid}>
        <Field label="Medio de pago">
          <FieldSelect
            value={composer.method}
            onChange={(event) =>
              composer.setMethod(event.target.value as PaymentMethod)
            }
          >
            {paymentMethods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </FieldSelect>
        </Field>
        {composer.terms === 'Crédito' && (
          <Field label="Abono inicial (opcional)">
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              value={composer.amount}
              onChange={(event) => composer.setAmount(event.target.value)}
            />
          </Field>
        )}
        {composer.method === 'Efectivo' ? (
          <Field
            label="Efectivo recibido"
            hint="Vacío: importe exacto del cobro."
          >
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              placeholder={String(composer.payCents / 100)}
              value={composer.tendered}
              onChange={(event) => composer.setTendered(event.target.value)}
            />
          </Field>
        ) : (
          <Field label="Referencia de pago confirmado">
            <FieldInput
              value={composer.reference}
              onChange={(event) => composer.setReference(event.target.value)}
            />
          </Field>
        )}
      </div>
      <CheckboxField
        checked={composer.confirmedLots}
        onChange={composer.setConfirmedLots}
      >
        Verifiqué que los lotes indicados corresponden a los productos que se
        lleva el cliente.
      </CheckboxField>
      <SectionHelp>
        Tarjeta y transferencia registran un pago ya confirmado. Esta demo no
        procesa cargos.
      </SectionHelp>
    </>
  )
}

import { useState } from 'react'

import { cancelRemainder } from '#/modules/counter/lib/orders'
import { ActionButton } from '#/modules/counter/components/action-button'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { StepPanel } from '#/modules/counter/components/metric-grid'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { Order } from '#/modules/counter/types/counter'

/** Release the reservations that will no longer be delivered. */
export function CancelForm({
  order,
  apply,
  onDone,
}: {
  order: Order
  apply: ApplyOperation
  onDone: () => void
}) {
  const [note, setNote] = useState('')

  return (
    <StepPanel>
      <Field label="Motivo para cancelar las cantidades aún no despachadas">
        <FieldInput
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <ActionButton
        className="self-start"
        onClick={() => {
          if (
            apply(
              (state) => cancelRemainder(state, order.id, note),
              'Reservas pendientes liberadas. Revisa si corresponde un reembolso.',
            )
          ) {
            onDone()
          }
        }}
      >
        Confirmar cancelación del pendiente
      </ActionButton>
    </StepPanel>
  )
}

import { useState } from 'react'

import { remaining } from '#/modules/counter/lib/amounts'
import { prepareOrder, rowKey } from '#/modules/counter/lib/orders'
import {
  ActionButton,
  TextLink,
} from '#/modules/counter/components/action-button'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { SectionHelp } from '#/modules/counter/components/info-banner'
import { StepPanel } from '#/modules/counter/components/metric-grid'
import { QuantityRow } from '#/modules/counter/components/quantity-row'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { Order } from '#/modules/counter/types/counter'

/** Verify quantities and lots, assign who prepares the order. */
export function PickForm({
  order,
  apply,
  onDone,
}: {
  order: Order
  apply: ApplyOperation
  onDone: () => void
}) {
  const [picker, setPicker] = useState(order.picker ?? '')
  const [note, setNote] = useState(order.pickNotes ?? '')
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      order.lines.flatMap((line) =>
        line.allocations.map((a) => [rowKey(line.productId, a.id), a.prepared]),
      ),
    ),
  )

  return (
    <StepPanel>
      <h3 className="text-base font-[650] text-[#244e7d]">
        Comprobar cantidades y lotes
      </h3>
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        <Field label="Responsable del surtido">
          <FieldInput
            value={picker}
            onChange={(event) => setPicker(event.target.value)}
            placeholder="Nombre de quien prepara"
          />
        </Field>
        <Field label="Faltantes / observaciones">
          <FieldInput
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Motivo si falta mercancía"
          />
        </Field>
      </div>
      {order.lines.flatMap((line) =>
        line.allocations
          .filter((a) => remaining(a) > 0)
          .map((a) => {
            const key = rowKey(line.productId, a.id)
            return (
              <QuantityRow
                key={key}
                title={line.productName}
                notes={[
                  `Lote ${a.lot} · Pendiente ${remaining(a)} ${line.unit}`,
                ]}
              >
                <Field label="Verificado">
                  <FieldInput
                    type="number"
                    min="0"
                    max={remaining(a)}
                    step="1"
                    value={quantities[key] || 0}
                    onChange={(event) =>
                      setQuantities({
                        ...quantities,
                        [key]: Number(event.target.value),
                      })
                    }
                  />
                </Field>
                <TextLink
                  onClick={() =>
                    setQuantities({ ...quantities, [key]: remaining(a) })
                  }
                >
                  Completo
                </TextLink>
              </QuantityRow>
            )
          }),
      )}
      <SectionHelp>
        Lo no preparado sigue reservado. Usa “Cancelar pendiente” si ya no se
        surtirá.
      </SectionHelp>
      <ActionButton
        tone="primary"
        className="self-start"
        onClick={() => {
          if (
            apply(
              (state) =>
                prepareOrder(state, order.id, picker, quantities, note),
              'Surtido verificado y responsable registrado.',
            )
          ) {
            onDone()
          }
        }}
      >
        Guardar preparación
      </ActionButton>
    </StepPanel>
  )
}

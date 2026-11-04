import { useState } from 'react'

import { returnOrder, rowKey } from '#/modules/counter/lib/orders'
import { ActionButton } from '#/modules/counter/components/action-button'
import {
  CheckboxField,
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/counter/components/form-controls'
import { SectionHelp } from '#/modules/counter/components/info-banner'
import { StepPanel } from '#/modules/counter/components/metric-grid'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { Order } from '#/modules/counter/types/counter'

/** Take back delivered goods at their original price. */
export function ReturnForm({
  order,
  apply,
  onDone,
}: {
  order: Order
  apply: ApplyOperation
  onDone: () => void
}) {
  const rows = order.lines.flatMap((line) =>
    line.allocations
      .filter((a) => a.delivered > a.returned)
      .map((allocation) => ({
        line,
        allocation,
        key: rowKey(line.productId, allocation.id),
      })),
  )
  const [selected, setSelected] = useState(rows.at(0)?.key ?? '')
  const [qty, setQty] = useState('1')
  const [damaged, setDamaged] = useState(false)
  const [note, setNote] = useState('')
  const row = rows.find((item) => item.key === selected)

  return (
    <StepPanel>
      <h3 className="text-base font-[650] text-[#244e7d]">
        Devolución de mercancía entregada
      </h3>
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        <Field label="Producto y lote original">
          <FieldSelect
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {rows.map((item) => (
              <option key={item.key} value={item.key}>
                {item.line.productName} · {item.allocation.lot} ·{' '}
                {item.allocation.delivered - item.allocation.returned}{' '}
                pendientes
              </option>
            ))}
          </FieldSelect>
        </Field>
        <Field label="Cantidad">
          <FieldInput
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
          />
        </Field>
        <Field label="Motivo">
          <FieldInput
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <CheckboxField checked={damaged} onChange={setDamaged}>
          Mercancía dañada · bloquear
        </CheckboxField>
      </div>
      <SectionHelp>
        Revierte la venta al precio original. Si ya se cobró, el saldo a favor
        se reembolsa por separado.
      </SectionHelp>
      <ActionButton
        tone="primary"
        className="self-start"
        disabled={!row}
        onClick={() => {
          if (
            row &&
            apply(
              (state) =>
                returnOrder(
                  state,
                  order.id,
                  row.line.productId,
                  Number(qty),
                  damaged,
                  note,
                  row.allocation.id,
                ),
              'Devolución registrada al precio original.',
            )
          ) {
            onDone()
          }
        }}
      >
        Registrar devolución recibida
      </ActionButton>
    </StepPanel>
  )
}

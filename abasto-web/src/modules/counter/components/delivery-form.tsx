import { useState } from 'react'

import { orderAllocations } from '#/modules/counter/lib/amounts'
import {
  pendingShipment,
  resolveShipment,
  rowKey,
} from '#/modules/counter/lib/orders'
import { ActionButton } from '#/modules/counter/components/action-button'
import {
  CheckboxField,
  Field,
  FieldInput,
} from '#/modules/counter/components/form-controls'
import { SectionHelp } from '#/modules/counter/components/info-banner'
import { StepPanel } from '#/modules/counter/components/metric-grid'
import { QuantityRow } from '#/modules/counter/components/quantity-row'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { Order, ShipmentRow } from '#/modules/counter/types/counter'

const pendingOf = (row: ShipmentRow) => row.qty - row.delivered - row.rejected

/** Confirm what the customer received and what came back from a shipment. */
export function DeliveryForm({
  order,
  apply,
  onDone,
}: {
  order: Order
  apply: ApplyOperation
  onDone: () => void
}) {
  const shipment = pendingShipment(order)
  const [received, setReceived] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (shipment?.rows ?? []).map((row) => [
        rowKey(row.productId, row.allocationId),
        pendingOf(row),
      ]),
    ),
  )
  const [returns, setReturns] = useState<Record<string, number>>({})
  const [damaged, setDamaged] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [returned, setReturned] = useState(false)

  if (!shipment) return null
  const hasRejection = Object.values(returns).some((qty) => qty > 0)
  const allocations = orderAllocations(order)

  return (
    <StepPanel>
      <h3 className="text-base font-[650] text-[#244e7d]">
        {order.fulfillment === 'Recolección'
          ? 'Confirmar recolección'
          : 'Confirmar entrega'}{' '}
        · {shipment.id}
      </h3>
      {shipment.rows
        .filter((row) => pendingOf(row) > 0)
        .map((row) => {
          const line = order.lines.find((l) => l.productId === row.productId)
          const allocation = allocations.find((a) => a.id === row.allocationId)
          const key = rowKey(row.productId, row.allocationId)
          if (!line || !allocation) return null
          const inRoute =
            pendingOf(row) - (received[key] || 0) - (returns[key] || 0)

          return (
            <QuantityRow
              key={key}
              title={line.productName}
              notes={[
                `${allocation.lot} · Por resolver ${pendingOf(row)} ${line.unit}`,
                `Seguirán en ruta: ${Math.max(0, inRoute)} ${line.unit}`,
              ]}
            >
              <Field label="Recibió el cliente ahora">
                <FieldInput
                  type="number"
                  min="0"
                  max={pendingOf(row)}
                  step="1"
                  value={received[key] ?? 0}
                  onChange={(event) =>
                    setReceived({
                      ...received,
                      [key]: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Rechazadas que regresaron">
                <FieldInput
                  type="number"
                  min="0"
                  max={pendingOf(row)}
                  step="1"
                  value={returns[key] ?? 0}
                  onChange={(event) => {
                    setReturns({
                      ...returns,
                      [key]: Number(event.target.value),
                    })
                    setReturned(false)
                  }}
                />
              </Field>
              {(returns[key] || 0) > 0 && (
                <CheckboxField
                  checked={Boolean(damaged[key])}
                  onChange={(checked) =>
                    setDamaged({ ...damaged, [key]: checked })
                  }
                >
                  Regresó dañada
                </CheckboxField>
              )}
            </QuantityRow>
          )
        })}
      <Field label="Observaciones / motivo del rechazo">
        <FieldInput
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {hasRejection && (
        <CheckboxField checked={returned} onChange={setReturned}>
          Confirmo que las cantidades rechazadas registradas ya regresaron
          físicamente al almacén.
        </CheckboxField>
      )}
      <SectionHelp>
        Puedes confirmar por partes. Lo que sigue en ruta no regresa al
        disponible. Lo rechazado que vuelve cierra esa cantidad del pedido; si
        está dañado, queda bloqueado.
      </SectionHelp>
      <ActionButton
        tone="primary"
        className="self-start"
        disabled={hasRejection && !returned}
        onClick={() => {
          if (
            apply(
              (state) =>
                resolveShipment(
                  state,
                  order.id,
                  shipment.id,
                  received,
                  damaged,
                  note,
                  returns,
                  new Date().toISOString(),
                ),
              'Entrega registrada. Lo pendiente continúa en ruta.',
            )
          ) {
            onDone()
          }
        }}
      >
        Confirmar cantidades
      </ActionButton>
    </StepPanel>
  )
}

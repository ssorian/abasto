import { Printer } from 'lucide-react'
import { useState } from 'react'

import {
  committedCents,
  orderAllocations,
  paidCents,
  remaining,
  soldCents,
} from '#/modules/counter/lib/amounts'
import { formatMoney } from '#/modules/counter/lib/money'
import {
  dispatchPrepared,
  pendingShipment,
  rowKey,
} from '#/modules/counter/lib/orders'
import { printTicket } from '#/modules/counter/lib/ticket'
import { ActionButton } from '#/modules/counter/components/action-button'
import { CancelForm } from '#/modules/counter/components/cancel-form'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { DeliveryForm } from '#/modules/counter/components/delivery-form'
import {
  DetailsBox,
  MetricGrid,
} from '#/modules/counter/components/metric-grid'
import { PickForm } from '#/modules/counter/components/pick-form'
import { PriceBreakdown } from '#/modules/counter/components/price-breakdown'
import { ReturnForm } from '#/modules/counter/components/return-form'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { CounterState, Order } from '#/modules/counter/types/counter'

type Stage = '' | 'pick' | 'delivery' | 'cancel' | 'return'

type OrderDetailDialogProps = {
  state: CounterState
  order: Order
  apply: ApplyOperation
  onClose: () => void
  onPay: () => void
}

/** Full operation of one order: money, actions, stage forms, lots and shipments. */
export function OrderDetailDialog({
  state,
  order,
  apply,
  onClose,
  onPay,
}: OrderDetailDialogProps) {
  const [stage, setStage] = useState<Stage>('')
  const allocations = orderAllocations(order)
  const committed = committedCents(order)
  const paid = paidCents(state, order.id)
  const shipment = pendingShipment(order)
  const close = () => setStage('')

  return (
    <CounterDialog
      wide
      title={`${order.id} · ${order.status}`}
      description={`${order.customer} · ${order.channel} · Almacén ${order.warehouse}`}
      onClose={onClose}
    >
      <MetricGrid
        items={[
          { label: 'Pedido vigente', value: formatMoney(committed) },
          {
            label: 'Venta entregada neta',
            value: formatMoney(soldCents(order)),
          },
          { label: 'Cobrado neto', value: formatMoney(paid) },
          {
            label: 'Por cobrar del pedido',
            value: formatMoney(Math.max(0, committed - paid)),
          },
        ]}
      />

      <DetailsBox>
        <p>
          <b>{order.fulfillment}</b>
          {order.address ? ` · ${order.address}` : ''}
          {order.contact ? ` · ${order.contact}` : ''}
        </p>
        <p>
          Pago: {order.terms}
          {order.dueDate ? ` · Vence ${order.dueDate}` : ''} · Prepara:{' '}
          {order.picker || 'Sin asignar'}
        </p>
        {order.notes && <p>{order.notes}</p>}
        {order.pickNotes && (
          <p className="mt-3 rounded-[7px] bg-[#fff7e0] p-3 text-xs leading-[1.7] whitespace-normal text-[#a08442]">
            Surtido: {order.pickNotes}
          </p>
        )}
      </DetailsBox>

      <div className="my-[14px] flex flex-wrap gap-[9px]">
        {allocations.some((a) => remaining(a) > 0) && (
          <>
            <ActionButton tone="primary" onClick={() => setStage('pick')}>
              Preparar / registrar faltantes
            </ActionButton>
            <ActionButton onClick={() => setStage('cancel')}>
              Cancelar pendiente
            </ActionButton>
          </>
        )}
        {allocations.some((a) => a.prepared > 0) && (
          <ActionButton
            tone="primary"
            disabled={Boolean(shipment)}
            onClick={() =>
              apply(
                (current) =>
                  dispatchPrepared(current, order.id, new Date().toISOString()),
                'Salida registrada. Confirma la entrega o recolección.',
              )
            }
          >
            Despachar lo preparado
          </ActionButton>
        )}
        {shipment && (
          <ActionButton tone="primary" onClick={() => setStage('delivery')}>
            Confirmar entrega / rechazo
          </ActionButton>
        )}
        {committed !== paid && (
          <ActionButton onClick={onPay}>
            {committed > paid ? 'Registrar cobro' : 'Reembolsar saldo'}
          </ActionButton>
        )}
        {allocations.some((a) => a.delivered > a.returned) && (
          <ActionButton onClick={() => setStage('return')}>
            Devolución del cliente
          </ActionButton>
        )}
        <ActionButton onClick={() => printTicket(state, order)}>
          <Printer size={16} />
          Ticket
        </ActionButton>
      </div>

      {stage === 'pick' && (
        <PickForm
          key={`${order.id}pick`}
          order={order}
          apply={apply}
          onDone={close}
        />
      )}
      {stage === 'delivery' && shipment && (
        <DeliveryForm
          key={shipment.id}
          order={order}
          apply={apply}
          onDone={close}
        />
      )}
      {stage === 'cancel' && (
        <CancelForm order={order} apply={apply} onDone={close} />
      )}
      {stage === 'return' && (
        <ReturnForm order={order} apply={apply} onDone={close} />
      )}

      {order.lines.map((line) => (
        <div key={line.productId}>
          <h3 className="my-[10px] text-[17px] font-semibold text-[#193c67]">
            {line.productName} · {line.qty} {line.unit}
          </h3>
          <PriceBreakdown rows={line.allocations} unit={line.unit} />
          <div className="my-[10px] text-[11px] leading-[1.9] text-[#75826e]">
            {line.allocations.map((a) => (
              <p key={a.id}>
                <b>{a.lot}</b> · Por surtir {remaining(a)} · Entregado{' '}
                {a.delivered} · Rechazado {a.rejected} · Cancelado {a.cancelled}{' '}
                · Devuelto {a.returned}
              </p>
            ))}
          </div>
        </div>
      ))}

      {order.shipments.length > 0 && (
        <div className="my-3 border-l-[3px] border-[#d4e3d4] px-[17px] py-[10px] text-xs leading-[1.8] text-[#637c99]">
          <h3 className="text-[15px] font-semibold">Salidas y entregas</h3>
          {order.shipments.map((item) => (
            <div key={item.id}>
              <p>
                <b>{item.id}</b> · {new Date(item.date).toLocaleString('es-MX')}{' '}
                · {item.resolvedAt ? 'Resuelta' : 'En tránsito'}
                {item.note ? ` · ${item.note}` : ''}
              </p>
              {item.rows.map((row) => {
                const line = order.lines.find(
                  (l) => l.productId === row.productId,
                )
                return (
                  <p key={rowKey(row.productId, row.allocationId)}>
                    {line?.productName} · Entregado {row.delivered} · Regresado{' '}
                    {row.rejected} · En ruta{' '}
                    {row.qty - row.delivered - row.rejected} {line?.unit}
                  </p>
                )
              })}
              {item.confirmations.map((confirmation) => (
                <small key={confirmation.date} className="block text-[#85927e]">
                  {new Date(confirmation.date).toLocaleString('es-MX')} ·{' '}
                  {confirmation.note || 'Confirmación de cantidades'}
                  <br />
                </small>
              ))}
            </div>
          ))}
        </div>
      )}
    </CounterDialog>
  )
}

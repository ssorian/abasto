import { useEffect, useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { PaymentStep } from '#/modules/counter/components/payment-step'
import { ReceiptView } from '#/modules/counter/components/receipt-view'
import { StatusBadge } from '#/modules/counter/components/status-badge'
import {
  useOrderActions,
  messageOf,
} from '#/modules/counter/hooks/use-order-actions'
import {
  appliedRuleLabel,
  expiryLabel,
  orderCode,
} from '#/modules/counter/lib/order-format'
import {
  availableActions,
  statusHint,
} from '#/modules/counter/lib/order-status'
import type { PickupWithReceipt } from '#/modules/counter/server/pickup'
import { formatCents } from '#/modules/pricing/lib/money'
import type { OrderDetail } from '#/modules/orders/services/order-reads'

type OrderViewDialogProps = {
  orderId: string
  now: Date
  /** The warehouse's drawer is open, so cash can be collected. */
  drawerOpen: boolean
  onClose: () => void
}

/** One order with frozen prices, the rule applied, lot allocations and its actions. */
export function OrderViewDialog({
  orderId,
  now,
  drawerOpen,
  onClose,
}: OrderViewDialogProps) {
  const actions = useOrderActions()
  const [order, setOrder] = useState<OrderDetail>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [paying, setPaying] = useState(false)
  const [receipt, setReceipt] = useState<PickupWithReceipt>()

  useEffect(() => {
    actions
      .detail(orderId)
      .then(setOrder, (failure) => setError(messageOf(failure)))
    // Loaded once per order.
  }, [orderId])

  async function act(
    run: (id: string) => Promise<{ data: OrderDetail } | undefined>,
  ) {
    setBusy(true)
    const result = await run(orderId)
    setBusy(false)
    setConfirmCancel(false)
    if (result) setOrder(result.data)
  }

  if (!order) {
    return (
      <CounterDialog title="Pedido" description="Cargando…" onClose={onClose}>
        {error && <p className="text-sm text-[#a1372e]">{error}</p>}
      </CounterDialog>
    )
  }
  if (receipt) {
    return (
      <CounterDialog
        title="Pedido entregado"
        description="Resumen del cobro."
        onClose={onClose}
      >
        <ReceiptView
          result={receipt}
          customerName={order.customerName}
          onDone={onClose}
        />
      </CounterDialog>
    )
  }
  const allowed = availableActions(order.status)

  return (
    <CounterDialog
      wide
      title={`${orderCode(order.id)} · ${order.customerName}`}
      description={statusHint(order.status)}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#8d6f79]">
        <StatusBadge status={order.status} />
        {(order.status === 'Reservado' || order.status === 'Preparado') && (
          <span>{expiryLabel(order.expiresAt, now)}</span>
        )}
        <span>Total {formatCents(order.totalCents)}</span>
        {order.notes && <span>Nota: {order.notes}</span>}
      </div>
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th>Cantidad</Th>
              <Th>Precio de lista</Th>
              <Th>Precio final</Th>
              <Th>Condición aplicada</Th>
              <Th>Importe</Th>
              <Th>Lotes</Th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id}>
                <Td>
                  {line.productName}
                  <CellNote>{line.presentationName}</CellNote>
                </Td>
                <Td>{line.quantity}</Td>
                <Td>{formatCents(line.listPriceCents)}</Td>
                <Td>{formatCents(line.unitPriceCents)}</Td>
                <Td>{appliedRuleLabel(line.rule)}</Td>
                <Td>{formatCents(line.lineTotalCents)}</Td>
                <Td className="whitespace-normal">
                  {line.allocations.map((a) => (
                    <CellNote key={a.lotId} className="mt-0">
                      {a.lotCode} × {a.quantity}
                      {a.expiresOn ? ` · vence ${a.expiresOn}` : ''}
                    </CellNote>
                  ))}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
      <p className="text-xs text-[#9c898f]">
        Los precios quedaron fijos al reservar. Cantidades en presentaciones;
        los lotes muestran unidades base.
      </p>
      {confirmCancel ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            ¿Cancelar este pedido? Se libera el producto apartado.
          </span>
          <ActionButton disabled={busy} onClick={() => act(actions.cancel)}>
            Sí, cancelar pedido
          </ActionButton>
          <ActionButton onClick={() => setConfirmCancel(false)}>
            No, volver
          </ActionButton>
        </div>
      ) : paying ? (
        <PaymentStep
          order={order}
          drawerOpen={drawerOpen}
          onPaid={setReceipt}
          onBack={() => setPaying(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {allowed.prepare && (
            <ActionButton disabled={busy} onClick={() => act(actions.prepare)}>
              Preparar
            </ActionButton>
          )}
          {allowed.pickup && (
            <ActionButton
              tone="primary"
              disabled={busy}
              onClick={() => setPaying(true)}
            >
              Entregar (recoge el cliente)
            </ActionButton>
          )}
          {allowed.cancel && (
            <ActionButton
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
            >
              Cancelar pedido
            </ActionButton>
          )}
        </div>
      )}
    </CounterDialog>
  )
}

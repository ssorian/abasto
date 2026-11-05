import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import { EmptyState } from '#/modules/counter/components/empty-state'
import { ActionButton } from '#/modules/counter/components/action-button'
import { StatusBadge } from '#/modules/counter/components/status-badge'
import { expiryLabel, orderCode } from '#/modules/counter/lib/order-format'
import { formatCents } from '#/modules/pricing/lib/money'
import type { OrderSummary } from '#/modules/orders/services/order-reads'

type OrderListProps = {
  orders: ReadonlyArray<OrderSummary>
  /** Server time the expiry labels are computed against. */
  now: Date
  onOpen: (orderId: string) => void
}

export function OrderList({ orders, now, onOpen }: OrderListProps) {
  if (orders.length === 0) {
    return <EmptyState>No hay pedidos con este filtro.</EmptyState>
  }
  return (
    <TableWrap className="rounded-xl border border-[#e3e9f0] bg-white">
      <DataTable>
        <thead>
          <tr>
            <Th>Pedido</Th>
            <Th>Cliente</Th>
            <Th>Estado</Th>
            <Th>Total</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-[#fafcff]">
              <Td>
                <strong>{orderCode(order.id)}</strong>
                <CellNote>
                  {order.status === 'Reservado' || order.status === 'Preparado'
                    ? expiryLabel(order.expiresAt, now)
                    : ''}
                </CellNote>
              </Td>
              <Td>{order.customerName}</Td>
              <Td>
                <StatusBadge status={order.status} />
              </Td>
              <Td>{formatCents(order.totalCents)}</Td>
              <Td>
                <ActionButton onClick={() => onOpen(order.id)}>
                  Ver pedido
                </ActionButton>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableWrap>
  )
}

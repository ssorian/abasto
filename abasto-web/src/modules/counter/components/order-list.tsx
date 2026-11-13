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
    <>
      <ul className="flex flex-col gap-2.5 md:hidden">
        {orders.map((order) => (
          <li
            key={order.id}
            className="rounded-xl border border-[#f0eae3] bg-white p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm">{orderCode(order.id)}</strong>
                <span className="block truncate text-[13px] text-[#785e67]">
                  {order.customerName}
                </span>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <strong className="text-base tabular-nums">
                  {formatCents(order.totalCents)}
                </strong>
                {order.status === 'Reservado' && (
                  <CellNote>{expiryLabel(order.expiresAt, now)}</CellNote>
                )}
              </div>
              <ActionButton onClick={() => onOpen(order.id)}>
                Ver pedido
              </ActionButton>
            </div>
          </li>
        ))}
      </ul>
      <TableWrap className="rounded-xl border border-[#f0eae3] bg-white max-md:hidden">
        <DataTable>
          <thead>
            <tr>
              <Th>Pedido</Th>
              <Th>Cliente</Th>
              <Th>Estado</Th>
              <Th className="text-right">Total</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-[#fefdfb]">
                <Td>
                  <strong>{orderCode(order.id)}</strong>
                  <CellNote>
                    {order.status === 'Reservado'
                      ? expiryLabel(order.expiresAt, now)
                      : ''}
                  </CellNote>
                </Td>
                <Td>{order.customerName}</Td>
                <Td>
                  <StatusBadge status={order.status} />
                </Td>
                <Td className="text-right tabular-nums">
                  {formatCents(order.totalCents)}
                </Td>
                <Td className="text-right">
                  <ActionButton onClick={() => onOpen(order.id)}>
                    Ver pedido
                  </ActionButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
    </>
  )
}

import { TruckIcon } from 'lucide-react'

import { formatCents } from '#/modules/pricing/lib/money'
import type { SupplierOrderSummary } from '#/modules/inventory/services/supplier-order-reads'
import { shortDate } from '#/modules/reports/lib/manager-format'
import {
  CardEmpty,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'

/** Supplier orders of this warehouse still waiting to be received. */
export function SupplierOrdersCard({
  orders,
}: {
  orders: Array<SupplierOrderSummary>
}) {
  const total = orders.reduce((sum, order) => sum + order.totalCostCents, 0)
  return (
    <ManagerCard
      title="Pedidos a proveedor"
      subtitle="Por recibir en tu almacén."
    >
      {orders.length === 0 ? (
        <CardEmpty>No hay pedidos pendientes con proveedores.</CardEmpty>
      ) : (
        <>
          <ul>
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center gap-3 border-t border-[#f5f1ed] py-3"
              >
                <span
                  className="grid size-9 flex-none place-items-center rounded-lg bg-[#e9f0fa] text-[#557caa]"
                  aria-hidden="true"
                >
                  <TruckIcon size={18} />
                </span>
                <div className="min-w-0 flex-1 text-[13px] text-ink-row">
                  <strong>
                    {order.supplierName}
                    {order.reference ? ` · ${order.reference}` : ''}
                  </strong>
                  <small className="mt-0.5 block text-[11px] text-muted-foreground">
                    {order.lineCount}{' '}
                    {order.lineCount === 1 ? 'línea' : 'líneas'} ·{' '}
                    {order.expectedOn
                      ? `llega el ${shortDate(order.expectedOn)}`
                      : 'sin fecha de entrega'}
                  </small>
                </div>
                <strong className="text-[13px] tabular-nums">
                  {formatCents(order.totalCostCents)}
                </strong>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-ink-muted">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} por
            recibir · {formatCents(total)}
          </p>
        </>
      )}
    </ManagerCard>
  )
}

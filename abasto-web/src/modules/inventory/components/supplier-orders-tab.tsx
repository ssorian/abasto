import {
  EyeIcon,
  PackageCheckIcon,
  PlusIcon,
  TruckIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { FieldSelect } from '#/modules/inventory/components/form-controls'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import { formatCents } from '#/modules/inventory/lib/cents'
import { dateLabel } from '#/modules/inventory/lib/format'
import { orderFilters } from '#/modules/inventory/lib/pending-labels'
import type { PurchaseStatus } from '#/modules/inventory/db/schema'
import type { SupplierOrderSummary } from '#/modules/inventory/services/supplier-orders'

type SupplierOrdersTabProps = {
  orders: ReadonlyArray<SupplierOrderSummary>
  canManage: boolean
  onNew: () => void
  onDetail: (order: SupplierOrderSummary) => void
  onReceive: (order: SupplierOrderSummary) => void
  onCancel: (order: SupplierOrderSummary) => void
}

/** What a received order lacked: units that did not arrive or came damaged. */
function Shortages({ order }: { order: SupplierOrderSummary }) {
  const notes = [
    order.missingQuantity > 0 &&
      `Faltaron ${order.missingQuantity} pzas (${formatCents(order.missingValueCents)})`,
    order.damagedQuantity > 0 &&
      `Dañadas ${order.damagedQuantity} pzas (${formatCents(order.damagedValueCents)})`,
  ].filter(Boolean)
  if (!notes.length) return null
  return <small className="block text-[#907e84]">{notes.join(' · ')}</small>
}

/** Queue of supplier orders of the warehouse; shows the waiting ones by default. */
export function SupplierOrdersTab({
  orders,
  canManage,
  onNew,
  onDetail,
  onReceive,
  onCancel,
}: SupplierOrdersTabProps) {
  const [filter, setFilter] = useState<PurchaseStatus | 'Todos'>('Pedido')
  const visible = orders.filter(
    (order) => filter === 'Todos' || order.status === filter,
  )
  return (
    <>
      <SectionRow
        title="Por recibir"
        description="Pedidos a proveedores que esperan llegar. Al recibirlos verificas lo que llegó y entran las existencias."
        action={
          canManage ? (
            <ActionButton tone="primary" onClick={onNew}>
              <PlusIcon size={19} />
              Nuevo pedido
            </ActionButton>
          ) : undefined
        }
      />
      <div className="mb-4 max-w-[220px]">
        <FieldSelect
          aria-label="Estado del pedido"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as PurchaseStatus | 'Todos')
          }
        >
          {orderFilters.map((option) => (
            <option key={option} value={option}>
              {option === 'Pedido' ? 'Por recibir' : option}
            </option>
          ))}
        </FieldSelect>
      </div>
      {visible.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>
              {[
                'Proveedor',
                'Estado',
                'Entrega esperada',
                'Productos',
                'Total',
                '',
              ]}
            </ListHead>
            <ListBody>
              {visible.map((order) => (
                <ListRow key={order.id}>
                  <ListCell>
                    <strong className="text-[#5f4a51]">
                      {order.supplierName}
                    </strong>
                    {order.reference && (
                      <small className="block text-[#907e84]">
                        {order.reference}
                      </small>
                    )}
                  </ListCell>
                  <ListCell>
                    <StockBadge value={order.status} />
                  </ListCell>
                  <ListCell>
                    {order.expectedOn ? dateLabel(order.expectedOn) : '—'}
                  </ListCell>
                  <ListCell>{order.lineCount}</ListCell>
                  <ListCell>
                    {formatCents(order.totalCostCents)} · a pagar{' '}
                    {formatCents(order.payableCents)}
                    {order.status === 'Recibido' && <Shortages order={order} />}
                  </ListCell>
                  <ListCell>
                    <span className="flex flex-wrap justify-end gap-2">
                      <ActionButton
                        tone="secondary"
                        className="min-h-9 px-3"
                        onClick={() => onDetail(order)}
                      >
                        <EyeIcon size={17} />
                        Ver detalle
                      </ActionButton>
                      {canManage && order.status === 'Pedido' && (
                        <>
                          <ActionButton
                            tone="primary"
                            className="min-h-9 px-3"
                            onClick={() => onReceive(order)}
                          >
                            <PackageCheckIcon size={17} />
                            Recibir
                          </ActionButton>
                          <ActionButton
                            className="min-h-9 px-3"
                            onClick={() => onCancel(order)}
                          >
                            <XIcon size={17} />
                            Cancelar
                          </ActionButton>
                        </>
                      )}
                    </span>
                  </ListCell>
                </ListRow>
              ))}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          icon={TruckIcon}
          title={
            filter === 'Pedido' ? 'No hay pedidos por recibir' : 'Sin pedidos'
          }
          description={
            canManage
              ? 'Pide mercancía a un proveedor y aparecerá aquí hasta que llegue.'
              : 'Los pedidos de este almacén aparecerán aquí.'
          }
        />
      )}
    </>
  )
}

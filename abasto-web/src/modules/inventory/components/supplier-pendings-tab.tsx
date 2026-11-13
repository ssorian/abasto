import { ScaleIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { boxCountLabel } from '#/modules/inventory/lib/order-rows'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { formatCents } from '#/modules/inventory/lib/cents'
import { dateLabel } from '#/modules/inventory/lib/format'
import { pendingTypeLabels } from '#/modules/inventory/lib/pending-labels'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import type {
  PendingBalance,
  PendingEntry,
} from '#/modules/inventory/services/supplier-pendings'

type SupplierPendingsTabProps = {
  restock: ReadonlyArray<PendingBalance>
  returns: ReadonlyArray<PendingBalance>
  history: ReadonlyArray<PendingEntry>
  suppliers: ReadonlyMap<string, string>
  products: ReadonlyMap<string, ProductLabel>
  onReturn: (pending: PendingBalance) => void
}

/** What each supplier owes us, split in boxes to replenish and boxes to return, and how it was settled. */
export function SupplierPendingsTab({
  restock,
  returns,
  history,
  suppliers,
  products,
  onReturn,
}: SupplierPendingsTabProps) {
  return (
    <>
      <SectionRow
        title="Saldos de proveedores"
        description="Lo faltante se repone en una recepción o se descuenta en el siguiente pedido al proveedor. Lo dañado o caducado se devuelve al proveedor."
      />
      <BalanceSection
        title="Por reponer"
        description="Cajas que nunca llegaron."
        emptyTitle="Ningún proveedor te debe cajas"
        emptyDescription="Lo faltante de un pedido recibido aparecerá aquí."
        rows={restock}
      />
      <BalanceSection
        title="Por devolver"
        description="Cajas dañadas o caducadas que siguen contigo; no son inventario."
        emptyTitle="No tienes cajas por devolver"
        emptyDescription="Lo dañado o caducado de un pedido recibido aparecerá aquí."
        action="Marcar como devuelto"
        rows={returns}
        onAction={onReturn}
      />
      {history.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-base font-[650] text-[#5f4a51]">
            Historial
          </h3>
          <ListPanel>
            <ListTable>
              <ListHead>
                {[
                  'Fecha',
                  'Proveedor',
                  'Producto',
                  'Movimiento',
                  'Cajas',
                  'Valor',
                ]}
              </ListHead>
              <ListBody>
                {history.map((entry) => {
                  const factor = products.get(entry.productId)?.pack.factor ?? 1
                  const count = Math.abs(entry.quantity) / factor
                  return (
                    <ListRow key={entry.id}>
                      <ListCell>
                        {dateLabel(new Date(entry.createdAt).toISOString())}
                      </ListCell>
                      <ListCell>
                        {suppliers.get(entry.supplierId) ?? 'Proveedor'}
                      </ListCell>
                      <ListCell>
                        {products.get(entry.productId)?.name ?? 'Producto'}
                      </ListCell>
                      <ListCell>{pendingTypeLabels[entry.type]}</ListCell>
                      <ListCell>
                        {entry.quantity > 0 ? '+' : '−'}
                        {count}
                      </ListCell>
                      <ListCell>
                        {formatCents(Math.abs(entry.valueCents))}
                      </ListCell>
                    </ListRow>
                  )
                })}
              </ListBody>
            </ListTable>
          </ListPanel>
        </>
      )}
    </>
  )
}

type BalanceSectionProps = {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  rows: ReadonlyArray<PendingBalance>
  /** Row action; omitted for balances settled elsewhere (restock: on the next order). */
  action?: string
  onAction?: (pending: PendingBalance) => void
}

function BalanceSection({
  title,
  description,
  emptyTitle,
  emptyDescription,
  action,
  rows,
  onAction,
}: BalanceSectionProps) {
  return (
    <section className="mt-6 first-of-type:mt-0">
      <h3 className="mb-1 text-base font-[650] text-[#5f4a51]">{title}</h3>
      <p className="mb-3 text-xs text-[#9c898f]">{description}</p>
      {rows.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>
              {[
                'Proveedor',
                'Producto',
                'Pedido',
                'Debe',
                'Valor',
                ...(action ? [''] : []),
              ]}
            </ListHead>
            <ListBody>
              {rows.map((row) => (
                <ListRow key={row.pendingId}>
                  <ListCell>
                    <strong className="text-[#5f4a51]">
                      {row.supplierName}
                    </strong>
                  </ListCell>
                  <ListCell>
                    {row.productName}
                    <small className="block text-[#907e84]">{row.sku}</small>
                  </ListCell>
                  <ListCell>{row.originCode}</ListCell>
                  <ListCell>
                    {boxCountLabel(row.owedBoxes, row.boxFactor)}
                  </ListCell>
                  <ListCell>{formatCents(row.owedValueCents)}</ListCell>
                  {action && onAction && (
                    <ListCell>
                      <span className="flex justify-end">
                        <ActionButton
                          className="min-h-9 px-3"
                          onClick={() => onAction(row)}
                        >
                          {action}
                        </ActionButton>
                      </span>
                    </ListCell>
                  )}
                </ListRow>
              ))}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          icon={ScaleIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </section>
  )
}

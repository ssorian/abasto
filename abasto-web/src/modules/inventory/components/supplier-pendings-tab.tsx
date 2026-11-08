import { ScaleIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
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
  OwedPending,
  PendingEntry,
} from '#/modules/inventory/services/supplier-pendings'

type SupplierPendingsTabProps = {
  owed: ReadonlyArray<OwedPending>
  history: ReadonlyArray<PendingEntry>
  suppliers: ReadonlyMap<string, string>
  products: ReadonlyMap<string, ProductLabel>
  onWriteOff: (pending: OwedPending) => void
}

const boxes = (count: number) => `${count} ${count === 1 ? 'caja' : 'cajas'}`

/** What each supplier owes us (damaged, expired or missing boxes) and how it was settled. */
export function SupplierPendingsTab({
  owed,
  history,
  suppliers,
  products,
  onWriteOff,
}: SupplierPendingsTabProps) {
  return (
    <>
      <SectionRow
        title="Saldos de proveedores"
        description="Cajas dañadas, caducadas o faltantes que el proveedor te debe. Se saldan reponiéndolas en un pedido próximo o descontándolas del pago."
      />
      {owed.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>
              {['Proveedor', 'Producto', 'Debe', 'Valor', '']}
            </ListHead>
            <ListBody>
              {owed.map((row) => (
                <ListRow key={`${row.supplierId}:${row.productId}`}>
                  <ListCell>
                    <strong className="text-[#5f4a51]">
                      {row.supplierName}
                    </strong>
                  </ListCell>
                  <ListCell>
                    {row.productName}
                    <small className="block text-[#907e84]">{row.sku}</small>
                  </ListCell>
                  <ListCell>{boxes(row.owedBoxes)}</ListCell>
                  <ListCell>{formatCents(row.owedValueCents)}</ListCell>
                  <ListCell>
                    <span className="flex justify-end">
                      <ActionButton
                        className="min-h-9 px-3"
                        onClick={() => onWriteOff(row)}
                      >
                        Descontar del pago (a lo chino)
                      </ActionButton>
                    </span>
                  </ListCell>
                </ListRow>
              ))}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          icon={ScaleIcon}
          title="Ningún proveedor te debe nada"
          description="Lo dañado, caducado o faltante de un pedido recibido aparecerá aquí."
        />
      )}
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

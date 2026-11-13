import { PlusIcon } from 'lucide-react'

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
import { MovementIcon } from '#/modules/inventory/components/movement-table'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { entryRows } from '#/modules/inventory/lib/entry-rows'
import { dateLabel, timeLabel } from '#/modules/inventory/lib/format'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { MovementEntry } from '#/modules/inventory/types/stock'

type EntriesTabProps = {
  rows: ReadonlyArray<MovementEntry>
  products: ReadonlyMap<string, ProductLabel>
  canManage: boolean
  onNew: () => void
}

/** Recent entries from received orders, taken from the ledger. */
export function EntriesTab({
  rows,
  products,
  canManage,
  onNew,
}: EntriesTabProps) {
  const entries = entryRows(rows)
  return (
    <>
      <SectionRow
        title="Entradas por pedido"
        description="Lo que entró al recibir pedidos de proveedores. Cada línea recibida crea su lote."
      />
      {entries.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>
              {['Pedido y lote', 'Producto', 'Cantidad', 'Recibió', 'Fecha']}
            </ListHead>
            <ListBody>
              {entries.map((entry) => {
                const product = products.get(entry.productId)
                return (
                  <ListRow key={entry.id}>
                    <ListCell>
                      <span className="flex items-center gap-[11px]">
                        <MovementIcon qty={entry.quantity} />
                        <strong className="text-[#5f4a51]">
                          {entry.orderCode}
                        </strong>
                      </span>
                    </ListCell>
                    <ListCell>
                      <strong>{product?.name ?? 'Producto'}</strong>
                      <small className="block text-[#907e84]">
                        {product?.sku}
                      </small>
                    </ListCell>
                    <ListCell>
                      <strong className="text-[#198567]">
                        +
                        {product
                          ? formatQuantity(entry.quantity, product.pack)
                          : entry.quantity}
                      </strong>
                    </ListCell>
                    <ListCell>{entry.receivedBy}</ListCell>
                    <ListCell>
                      {dateLabel(entry.createdAt)}
                      <small className="block text-[#907e84]">
                        {timeLabel(entry.createdAt)}
                      </small>
                    </ListCell>
                  </ListRow>
                )
              })}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          title="Aún no hay entradas"
          description={
            canManage
              ? 'Pide mercancía a un proveedor y recíbela para dar de alta existencias.'
              : 'Los pedidos que reciba el encargado aparecerán aquí.'
          }
        >
          {canManage && (
            <ActionButton tone="primary" onClick={onNew}>
              <PlusIcon size={19} />
              Nuevo pedido
            </ActionButton>
          )}
        </EmptyPanel>
      )}
    </>
  )
}

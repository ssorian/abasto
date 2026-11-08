import { PlusIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { MovementTable } from '#/modules/inventory/components/movement-table'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import { SectionRow } from '#/modules/inventory/components/section-row'
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
  return (
    <>
      <SectionRow
        title="Entradas por pedido"
        description="Lo que ha entrado recientemente al recibir pedidos de proveedores. Cada línea recibida crea su lote."
        action={
          canManage ? (
            <ActionButton tone="primary" onClick={onNew}>
              <PlusIcon size={19} />
              Nuevo pedido
            </ActionButton>
          ) : undefined
        }
      />
      <MovementTable
        rows={rows.filter((row) => row.type === 'purchase')}
        products={products}
        emptyTitle="Aún no hay entradas"
        emptyDescription={
          canManage
            ? 'Pide mercancía a un proveedor y recíbela para dar de alta existencias.'
            : 'Los pedidos que reciba el encargado aparecerán aquí.'
        }
      />
    </>
  )
}

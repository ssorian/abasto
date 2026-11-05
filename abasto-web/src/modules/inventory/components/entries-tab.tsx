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

/** Recent purchase entries of the warehouse, taken from the ledger. */
export function EntriesTab({
  rows,
  products,
  canManage,
  onNew,
}: EntriesTabProps) {
  return (
    <>
      <SectionRow
        title="Compras a proveedores"
        description="Lo que has recibido recientemente. Cada compra crea sus lotes."
        action={
          canManage ? (
            <ActionButton tone="primary" onClick={onNew}>
              <PlusIcon size={19} />
              Nueva compra
            </ActionButton>
          ) : undefined
        }
      />
      <MovementTable
        rows={rows.filter((row) => row.type === 'purchase')}
        products={products}
        emptyTitle="Aún no hay compras"
        emptyDescription={
          canManage
            ? 'Registra tu primera compra para dar de alta existencias.'
            : 'Las compras que registre el encargado aparecerán aquí.'
        }
      />
    </>
  )
}

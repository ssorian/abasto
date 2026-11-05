import { ClipboardCheckIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { MovementTable } from '#/modules/inventory/components/movement-table'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import { SectionRow } from '#/modules/inventory/components/section-row'
import type { MovementEntry } from '#/modules/inventory/types/stock'

type CountsTabProps = {
  rows: ReadonlyArray<MovementEntry>
  products: ReadonlyMap<string, ProductLabel>
  canManage: boolean
  onNew: () => void
}

/** Physical counts: the ledger entries counts left behind (exact matches leave none). */
export function CountsTab({
  rows,
  products,
  canManage,
  onNew,
}: CountsTabProps) {
  return (
    <>
      <SectionRow
        title="Conteos físicos"
        description="Cuenta un producto y el sistema corrige la diferencia. Un conteo sin diferencia no deja movimiento."
        action={
          canManage ? (
            <ActionButton tone="primary" onClick={onNew}>
              <ClipboardCheckIcon size={18} />
              Hacer conteo
            </ActionButton>
          ) : undefined
        }
      />
      <MovementTable
        rows={rows.filter((row) => row.type === 'count')}
        products={products}
        emptyTitle="Aún no hay diferencias de conteo"
        emptyDescription="Las diferencias que encuentres al contar aparecerán aquí."
      />
    </>
  )
}

import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { MovementTable } from '#/modules/inventory/components/movement-table'
import type { ProductLabel } from '#/modules/inventory/components/movement-table'
import { Picker } from '#/modules/inventory/components/picker'
import { SearchBox } from '#/modules/inventory/components/search-box'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { movementLabel } from '#/modules/inventory/lib/pack-info'
import type { MovementType } from '#/modules/inventory/db/schema'
import type { MovementEntry } from '#/modules/inventory/types/stock'
import { normalize } from '#/modules/inventory/lib/format'

export { MovementIcon } from '#/modules/inventory/components/movement-table'

const movementTypes: ReadonlyArray<MovementType> = [
  'purchase',
  'adjustment',
  'loss',
  'count',
  'sale',
  'transfer_out',
  'transfer_in',
  'transfer_return',
]

const typeOptions = [
  { value: 'Todos', label: 'Todos los movimientos' },
  ...movementTypes.map((type) => ({ value: type, label: movementLabel(type) })),
]

type MovementsTabProps = {
  rows: ReadonlyArray<MovementEntry>
  products: ReadonlyMap<string, ProductLabel>
  query: string
  onQueryChange: (value: string) => void
  type: string
  onTypeChange: (value: string) => void
}

/** Ledger of the warehouse: filter by product text and movement type. */
export function MovementsTab({
  rows,
  products,
  query,
  onQueryChange,
  type,
  onTypeChange,
}: MovementsTabProps) {
  const needle = normalize(query.trim())
  const visible = rows.filter((row) => {
    if (type !== 'Todos' && row.type !== type) return false
    if (!needle) return true
    const product = products.get(row.productId)
    return normalize(
      `${product?.name ?? ''} ${product?.sku ?? ''} ${row.lotCode} ${row.reason}`,
    ).includes(needle)
  })
  return (
    <>
      <SectionRow
        title="El recorrido de tu inventario"
        description="Cada entrada, ajuste, pérdida, conteo y traslado queda registrado y no se puede borrar."
      />
      <div className="mb-[15px] flex flex-wrap items-center gap-2.5 md:mb-[18px] md:flex-nowrap md:gap-3">
        <SearchBox
          label="Buscar en movimientos"
          placeholder="Buscar producto, lote o motivo..."
          value={query}
          onChange={onQueryChange}
        />
        <Picker
          label="Tipo de movimiento"
          value={type}
          onChange={onTypeChange}
          options={typeOptions}
          className="data-[size=default]:h-9 text-xs md:data-[size=default]:h-[43px] md:text-sm"
        />
      </div>
      {rows.length ? (
        <MovementTable
          rows={visible}
          products={products}
          emptyTitle="Sin resultados"
          emptyDescription="Prueba con otro filtro."
        />
      ) : (
        <EmptyPanel
          title="Aún no hay movimientos"
          description="Cuando registres una compra, un ajuste o un conteo, aparecerá aquí."
        />
      )}
    </>
  )
}

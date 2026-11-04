import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { ProductCard } from '#/modules/inventory/components/product-card'
import { ProductsTable } from '#/modules/inventory/components/products-table'
import {
  ProductToolbar,
  StatusChips,
} from '#/modules/inventory/components/product-toolbar'
import { ShieldCheckIcon } from 'lucide-react'

import type {
  ProductRow,
  ProductSort,
  StatusFilter,
} from '#/modules/inventory/lib/filters'
import type { ProductView } from '#/modules/inventory/components/product-toolbar'
import type { InventoryProduct } from '#/modules/inventory/types/inventory'

type ProductsTabProps = {
  rows: ReadonlyArray<ProductRow>
  total: number
  lowCount: number
  query: string
  onQueryChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  sort: ProductSort
  onSortChange: (value: ProductSort) => void
  filter: StatusFilter
  onFilterChange: (value: StatusFilter) => void
  view: ProductView
  onViewChange: (value: ProductView) => void
  onOpen: (product: InventoryProduct) => void
  onRestock: (product: InventoryProduct) => void
  onClear: () => void
}

/** Productos tab: toolbar, status chips and the card or table listing. */
export function ProductsTab(props: ProductsTabProps) {
  const { rows, total, view, onOpen, onRestock, onClear } = props

  return (
    <>
      <ProductToolbar
        query={props.query}
        onQueryChange={props.onQueryChange}
        category={props.category}
        onCategoryChange={props.onCategoryChange}
        sort={props.sort}
        onSortChange={props.onSortChange}
      />
      <StatusChips
        filter={props.filter}
        onFilterChange={props.onFilterChange}
        lowCount={props.lowCount}
        view={view}
        onViewChange={props.onViewChange}
        shown={rows.length}
        total={total}
      />
      {rows.length ? (
        view === 'table' ? (
          <ProductsTable rows={rows} onSelect={onOpen} />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4 tablet:grid-cols-3 wide:gap-5">
            {rows.map((row) => (
              <ProductCard
                key={row.product.id}
                row={row}
                onOpen={() => onOpen(row.product)}
                onRestock={() => onRestock(row.product)}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyPanel
          title="No encontramos productos"
          description="Prueba con otro nombre o cambia los filtros."
        >
          <ActionButton onClick={onClear}>Limpiar filtros</ActionButton>
        </EmptyPanel>
      )}
      <div className="mt-[23px] flex flex-wrap items-start gap-[7px] text-xs leading-[1.8] text-[#9aa5b3] max-md:flex-nowrap">
        <ShieldCheckIcon size={16} className="mt-0.5 shrink-0" />
        <span>
          Disponible = físico − reservado − bloqueado (incluye vencidos). Cada
          cambio queda registrado en movimientos.
        </span>
        <span className="ml-auto">Costos en MXN por unidad de manejo</span>
      </div>
    </>
  )
}

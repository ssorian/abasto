import { createFileRoute } from '@tanstack/react-router'

import { InventoryPage } from '#/modules/inventory/components/inventory-page'
import { warehouseNames } from '#/shared/demo/types'

import type { WarehouseName } from '#/shared/demo/types'

type InventorySearch = {
  /** Optional product query, e.g. from Catálogo "Consultar inventario". */
  q?: string
  /** Optional warehouse, e.g. from Almacenes "Ver inventario". */
  almacen?: WarehouseName
}

const isWarehouse = (value: unknown): value is WarehouseName =>
  warehouseNames.some((name) => name === value)

export const Route = createFileRoute('/inventario')({
  validateSearch: (search: Record<string, unknown>): InventorySearch => ({
    ...(typeof search.q === 'string' && search.q.trim() !== ''
      ? { q: search.q }
      : {}),
    ...(isWarehouse(search.almacen) ? { almacen: search.almacen } : {}),
  }),
  component: InventoryRoute,
})

function InventoryRoute() {
  const { q, almacen } = Route.useSearch()
  return (
    <InventoryPage
      key={almacen ?? 'Centro'}
      initialQuery={q ?? ''}
      initialWarehouse={almacen ?? 'Centro'}
    />
  )
}

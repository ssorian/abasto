import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import {
  listProductsFn,
  listSuppliersFn,
} from '#/modules/catalog/server/catalog'
import { InventoryPage } from '#/modules/inventory/components/inventory-page'
import { inventoryOverviewFn } from '#/modules/inventory/server/inventory'

type InventorySearch = {
  /** Optional product query, e.g. from Catálogo "Consultar inventario". */
  q?: string
  /** Optional warehouse id, e.g. from Almacenes "Ver inventario". */
  almacen?: string
}

export const Route = createFileRoute('/inventario')({
  validateSearch: (search: Record<string, unknown>): InventorySearch => ({
    ...(typeof search.q === 'string' && search.q.trim() !== ''
      ? { q: search.q }
      : {}),
    ...(typeof search.almacen === 'string' && search.almacen !== ''
      ? { almacen: search.almacen }
      : {}),
  }),
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) => {
    const [overview, products, suppliers] = await Promise.all([
      inventoryOverviewFn({ data: { warehouseId: deps.almacen } }),
      listProductsFn(),
      listSuppliersFn(),
    ])
    return {
      overview: unwrap(overview),
      products: unwrap(products),
      suppliers: unwrap(suppliers),
    }
  },
  component: InventoryRoute,
})

function InventoryRoute() {
  const { q } = Route.useSearch()
  const { overview, products, suppliers } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return (
    <InventoryPage
      // A different warehouse starts with fresh filters.
      key={overview.selectedId ?? 'none'}
      overview={overview}
      products={products}
      suppliers={suppliers}
      initialQuery={q ?? ''}
      onSelectWarehouse={(almacen) =>
        void navigate({ search: (current) => ({ ...current, almacen }) })
      }
    />
  )
}

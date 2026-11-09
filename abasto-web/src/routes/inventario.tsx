import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import {
  listProductsFn,
  listSuppliersFn,
} from '#/modules/catalog/server/catalog'
import { InventoryPage } from '#/modules/inventory/components/inventory-page'
import { inventoryOverviewFn } from '#/modules/inventory/server/inventory'
import {
  supplierOrdersFn,
  supplierPendingsFn,
} from '#/modules/inventory/server/supplier-orders'
import { transfersOverviewFn } from '#/modules/transfers/server/transfers'

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
    const loaded = unwrap(overview)
    const transfers = loaded.selectedId
      ? unwrap(
          await transfersOverviewFn({
            data: { warehouseId: loaded.selectedId },
          }),
        )
      : { transfers: [], destinations: [] }
    const selected = loaded.warehouses.find(
      ({ id }) => id === loaded.selectedId,
    )
    // Orders and supplier balances are only for managers of the warehouse.
    const [supplierOrders, pendings] =
      selected?.canManage && loaded.selectedId
        ? await Promise.all([
            supplierOrdersFn({ data: { warehouseId: loaded.selectedId } }),
            supplierPendingsFn({ data: {} }),
          ]).then(
            ([orders, balances]) => [unwrap(orders), unwrap(balances)] as const,
          )
        : ([[], { restock: [], returns: [], history: [] }] as const)
    return {
      overview: loaded,
      supplierOrders,
      pendings,
      products: unwrap(products),
      suppliers: unwrap(suppliers),
      transfers,
    }
  },
  component: InventoryRoute,
})

function InventoryRoute() {
  const { q } = Route.useSearch()
  const { overview, products, suppliers, transfers, supplierOrders, pendings } =
    Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  return (
    <InventoryPage
      // A different warehouse starts with fresh filters.
      key={overview.selectedId ?? 'none'}
      overview={overview}
      products={products}
      suppliers={suppliers}
      canEditProducts={user?.role === 'owner'}
      transfers={transfers}
      supplierOrders={[...supplierOrders]}
      pendings={{
        restock: [...pendings.restock],
        returns: [...pendings.returns],
        history: [...pendings.history],
      }}
      initialQuery={q ?? ''}
      onSelectWarehouse={(almacen) =>
        void navigate({ search: (current) => ({ ...current, almacen }) })
      }
    />
  )
}

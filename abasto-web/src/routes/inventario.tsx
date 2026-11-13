import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import {
  listCatalogProductsFn,
  listSuppliersFn,
} from '#/modules/catalog/server/catalog'
import { InventoryPage } from '#/modules/inventory/components/inventory-page'
import { inventoryActionOf } from '#/modules/inventory/lib/inventory-action'
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
  /** Dialog to open on arrival, e.g. from an Inicio alert: `quitar` or `pedido`. */
  accion?: string
  producto?: string
  lote?: string
}

export const Route = createFileRoute('/inventario')({
  validateSearch: (search: Record<string, unknown>): InventorySearch => ({
    ...(typeof search.q === 'string' && search.q.trim() !== ''
      ? { q: search.q }
      : {}),
    ...(typeof search.almacen === 'string' && search.almacen !== ''
      ? { almacen: search.almacen }
      : {}),
    ...(() => {
      const action = inventoryActionOf(search)
      if (!action) return {}
      return action.kind === 'quitar'
        ? { accion: 'quitar', producto: action.productId, lote: action.lotId }
        : { accion: 'pedido', producto: action.productId }
    })(),
  }),
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) => {
    const [overview, products, suppliers] = await Promise.all([
      inventoryOverviewFn({ data: { warehouseId: deps.almacen } }),
      listCatalogProductsFn(),
      listSuppliersFn(),
    ])
    const loaded = unwrap(overview)
    const selected = loaded.warehouses.find(
      ({ id }) => id === loaded.selectedId,
    )
    const warehouseId = loaded.selectedId
    // Transfers, orders and supplier balances only need the selected
    // warehouse, so they load together. Orders and balances are only for
    // managers of the warehouse.
    const [transfersResult, ordersResult, pendingsResult] = await Promise.all([
      warehouseId ? transfersOverviewFn({ data: { warehouseId } }) : undefined,
      selected?.canManage && warehouseId
        ? supplierOrdersFn({ data: { warehouseId } })
        : undefined,
      selected?.canManage && warehouseId
        ? supplierPendingsFn({ data: {} })
        : undefined,
    ])
    const transfers = transfersResult
      ? unwrap(transfersResult)
      : { transfers: [], destinations: [] }
    const supplierOrders = ordersResult ? unwrap(ordersResult) : []
    const pendings = pendingsResult
      ? unwrap(pendingsResult)
      : { restock: [], returns: [], history: [] }
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
  const search = Route.useSearch()
  const { q } = search
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
      canEditProducts={
        user?.role === 'owner' ||
        overview.warehouses.some((warehouse) => warehouse.canManage)
      }
      transfers={transfers}
      supplierOrders={[...supplierOrders]}
      pendings={{
        restock: [...pendings.restock],
        returns: [...pendings.returns],
        history: [...pendings.history],
      }}
      initialQuery={q ?? ''}
      initialAction={inventoryActionOf(search)}
      onActionDone={() =>
        void navigate({
          replace: true,
          search: ({ accion: _a, producto: _p, lote: _l, ...rest }) => rest,
        })
      }
      onSelectWarehouse={(almacen) =>
        void navigate({ search: (current) => ({ ...current, almacen }) })
      }
    />
  )
}

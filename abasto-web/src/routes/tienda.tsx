import { Outlet, createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { StoreShell } from '#/modules/store/components/store-shell'
import { storeTitle } from '#/modules/store/lib/store-config'
import {
  storeCatalogFn,
  storeWarehousesFn,
} from '#/modules/store/server/storefront'

export const Route = createFileRoute('/tienda')({
  validateSearch: (search: Record<string, unknown>): { almacen?: string } =>
    typeof search.almacen === 'string' && search.almacen
      ? { almacen: search.almacen }
      : {},
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) => {
    const warehouses = unwrap(await storeWarehousesFn())
    const warehouse =
      warehouses.find((entry) => entry.id === deps.almacen) ??
      warehouses.at(0) ??
      null
    const catalog = warehouse
      ? unwrap(await storeCatalogFn({ data: { warehouseId: warehouse.id } }))
      : []
    return { warehouses, warehouse, catalog }
  },
  head: () => ({ meta: [{ title: storeTitle('Tienda') }] }),
  component: function StoreLayout() {
    const { user } = Route.useRouteContext()
    const { warehouse, catalog } = Route.useLoaderData()
    return (
      <StoreShell user={user} warehouse={warehouse} catalog={catalog}>
        <Outlet />
      </StoreShell>
    )
  },
})

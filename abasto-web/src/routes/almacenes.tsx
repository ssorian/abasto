import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { WarehousesPage } from '#/modules/warehouses/components/warehouses-page'
import { listWarehousesFn } from '#/modules/warehouses/server/warehouses'

export const Route = createFileRoute('/almacenes')({
  loader: async () => unwrap(await listWarehousesFn()),
  component: function Warehouses() {
    const warehouses = Route.useLoaderData()
    const { user } = Route.useRouteContext()
    return (
      <WarehousesPage
        warehouses={warehouses}
        canCreate={user?.role === 'owner'}
      />
    )
  },
})

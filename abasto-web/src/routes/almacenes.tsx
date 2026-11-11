import { createFileRoute, redirect } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { WarehousesPage } from '#/modules/warehouses/components/warehouses-page'
import { warehouseOverviewFn } from '#/modules/warehouses/server/warehouses'

export const Route = createFileRoute('/almacenes')({
  // Owner only: staff opening the URL go back to Inicio.
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'owner') throw redirect({ to: '/' })
  },
  loader: async () => unwrap(await warehouseOverviewFn()),
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

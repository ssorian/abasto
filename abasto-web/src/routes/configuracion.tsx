import { createFileRoute, redirect } from '@tanstack/react-router'
import { unwrap } from '#/lib/boundary'
import { SettingsPage } from '#/modules/access/components/settings-page'
import { listUsersFn } from '#/modules/access/server/users'
import { listWarehousesFn } from '#/modules/warehouses/server/warehouses'

export const Route = createFileRoute('/configuracion')({
  // Owner only: staff opening the URL go back to Inicio, like /almacenes.
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'owner') throw redirect({ to: '/' })
  },
  loader: async () => {
    const [users, warehouses] = await Promise.all([
      listUsersFn(),
      listWarehousesFn(),
    ])
    return {
      users: unwrap(users),
      warehouses: unwrap(warehouses),
    }
  },
  component: function Settings() {
    return <SettingsPage {...Route.useLoaderData()} />
  },
})

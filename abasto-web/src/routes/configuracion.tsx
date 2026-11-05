import { createFileRoute } from '@tanstack/react-router'
import { unwrap } from '#/lib/boundary'
import { SettingsPage } from '#/modules/access/components/settings-page'
import { listUsersFn } from '#/modules/access/server/users'
import { listWarehousesFn } from '#/modules/warehouses/server/warehouses'

export const Route = createFileRoute('/configuracion')({
  loader: async ({ context }) => {
    // Staff never call the owner-only list; the page shows the permission message.
    if (context.user?.role !== 'owner') return { allowed: false as const }
    const [users, warehouses] = await Promise.all([
      listUsersFn(),
      listWarehousesFn(),
    ])
    return {
      allowed: true as const,
      users: unwrap(users),
      warehouses: unwrap(warehouses),
    }
  },
  component: function Settings() {
    return <SettingsPage {...Route.useLoaderData()} />
  },
})

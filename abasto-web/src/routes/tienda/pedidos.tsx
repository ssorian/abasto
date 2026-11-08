import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { OrdersPage } from '#/modules/store/components/orders-page'
import { myOrdersFn } from '#/modules/store/server/storefront'

export const Route = createFileRoute('/tienda/pedidos')({
  loader: async ({ context }) =>
    context.user?.role === 'customer' ? unwrap(await myOrdersFn()) : null,
  head: () => ({ meta: [{ title: 'Mis pedidos · Tienda' }] }),
  component: function StoreOrders() {
    const { user } = Route.useRouteContext()
    return <OrdersPage user={user} orders={Route.useLoaderData()} />
  },
})

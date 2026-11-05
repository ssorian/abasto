import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { CatalogPage } from '#/modules/catalog/components/catalog-page'
import {
  listProductsFn,
  listSuppliersFn,
} from '#/modules/catalog/server/catalog'

export const Route = createFileRoute('/catalogo')({
  loader: async () => {
    const [products, suppliers] = await Promise.all([
      listProductsFn(),
      listSuppliersFn(),
    ])
    return { products: unwrap(products), suppliers: unwrap(suppliers) }
  },
  component: function Catalog() {
    const { products, suppliers } = Route.useLoaderData()
    const { user } = Route.useRouteContext()
    return (
      <CatalogPage
        products={products}
        suppliers={suppliers}
        canManage={user?.role === 'owner'}
      />
    )
  },
})

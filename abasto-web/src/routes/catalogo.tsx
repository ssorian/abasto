import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { CatalogPage } from '#/modules/catalog/components/catalog-page'
import {
  listCatalogProductsFn,
  listSuppliersFn,
} from '#/modules/catalog/server/catalog'
import { pricingOverviewFn } from '#/modules/pricing/server/pricing'

export const Route = createFileRoute('/catalogo')({
  validateSearch: (search: Record<string, unknown>): { almacen?: string } =>
    typeof search.almacen === 'string' ? { almacen: search.almacen } : {},
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) => {
    const [products, suppliers, pricing] = await Promise.all([
      listCatalogProductsFn(),
      listSuppliersFn(),
      pricingOverviewFn({ data: { warehouseId: deps.almacen } }),
    ])
    return {
      products: unwrap(products),
      suppliers: unwrap(suppliers),
      pricing: unwrap(pricing),
    }
  },
  component: function Catalog() {
    const { products, suppliers, pricing } = Route.useLoaderData()
    const { user } = Route.useRouteContext()
    const navigate = Route.useNavigate()
    return (
      <CatalogPage
        products={products}
        suppliers={suppliers}
        canManage={user?.role === 'owner'}
        pricing={pricing}
        onSelectWarehouse={(almacen) => void navigate({ search: { almacen } })}
      />
    )
  },
})

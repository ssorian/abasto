import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import {
  listProductsFn,
  listSuppliersFn,
} from '#/modules/catalog/server/catalog'
import { PricesPage } from '#/modules/pricing/components/prices-page'
import { pricingOverviewFn } from '#/modules/pricing/server/pricing'

export const Route = createFileRoute('/precios')({
  validateSearch: (search: Record<string, unknown>): { almacen?: string } =>
    typeof search.almacen === 'string' ? { almacen: search.almacen } : {},
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) => {
    const [overview, products, suppliers] = await Promise.all([
      pricingOverviewFn({ data: { warehouseId: deps.almacen } }),
      listProductsFn(),
      listSuppliersFn(),
    ])
    return {
      overview: unwrap(overview),
      products: unwrap(products),
      suppliers: unwrap(suppliers),
    }
  },
  component: function Prices() {
    const { overview, products, suppliers } = Route.useLoaderData()
    const navigate = Route.useNavigate()
    return (
      <PricesPage
        overview={overview}
        products={products}
        suppliers={suppliers}
        onSelectWarehouse={(almacen) => void navigate({ search: { almacen } })}
      />
    )
  },
})

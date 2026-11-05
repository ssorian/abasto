import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { listProductsFn } from '#/modules/catalog/server/catalog'
import { CustomersPage } from '#/modules/customers/components/customers-page'
import { presentationOptions } from '#/modules/customers/lib/customer-labels'
import { customersOverviewFn } from '#/modules/customers/server/customers'

export const Route = createFileRoute('/clientes')({
  loader: async () => {
    const [overview, products] = await Promise.all([
      customersOverviewFn(),
      listProductsFn(),
    ])
    return {
      overview: unwrap(overview),
      presentations: presentationOptions(unwrap(products)),
    }
  },
  component: CustomersRoute,
})

function CustomersRoute() {
  const { overview, presentations } = Route.useLoaderData()
  return <CustomersPage overview={overview} presentations={presentations} />
}

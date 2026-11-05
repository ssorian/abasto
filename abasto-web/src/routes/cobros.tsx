import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { ReceivablesPage } from '#/modules/credit/components/receivables-page'
import { receivablesFn } from '#/modules/credit/server/credit'

type ReceivablesSearch = {
  /** Optional warehouse id that receives abonos. */
  almacen?: string
}

export const Route = createFileRoute('/cobros')({
  validateSearch: (search: Record<string, unknown>): ReceivablesSearch => ({
    ...(typeof search.almacen === 'string' && search.almacen !== ''
      ? { almacen: search.almacen }
      : {}),
  }),
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) =>
    unwrap(await receivablesFn({ data: { warehouseId: deps.almacen } })),
  component: ReceivablesRoute,
})

function ReceivablesRoute() {
  const overview = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return (
    <ReceivablesPage
      key={overview.selectedId ?? 'none'}
      overview={overview}
      onSelectWarehouse={(almacen) =>
        void navigate({ search: (current) => ({ ...current, almacen }) })
      }
    />
  )
}

import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { CounterPage } from '#/modules/counter/components/counter-page'
import { counterOverviewFn } from '#/modules/counter/server/counter'

type CounterSearch = {
  /** Optional warehouse id. */
  almacen?: string
}

export const Route = createFileRoute('/mostrador')({
  validateSearch: (search: Record<string, unknown>): CounterSearch => ({
    ...(typeof search.almacen === 'string' && search.almacen !== ''
      ? { almacen: search.almacen }
      : {}),
  }),
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) =>
    unwrap(await counterOverviewFn({ data: { warehouseId: deps.almacen } })),
  component: CounterRoute,
})

function CounterRoute() {
  const overview = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return (
    <CounterPage
      // A different warehouse starts with fresh filters.
      key={overview.selectedId ?? 'none'}
      overview={overview}
      onSelectWarehouse={(almacen) =>
        void navigate({ search: (current) => ({ ...current, almacen }) })
      }
    />
  )
}

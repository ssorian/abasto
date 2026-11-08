import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { RepartosPage } from '#/modules/riders/components/repartos-page'
import { ridersOverviewFn } from '#/modules/riders/server/riders'

type RepartosSearch = {
  /** Optional warehouse id. */
  almacen?: string
}

export const Route = createFileRoute('/repartos')({
  validateSearch: (search: Record<string, unknown>): RepartosSearch => ({
    ...(typeof search.almacen === 'string' && search.almacen !== ''
      ? { almacen: search.almacen }
      : {}),
  }),
  loaderDeps: ({ search }) => ({ almacen: search.almacen }),
  loader: async ({ deps }) =>
    unwrap(await ridersOverviewFn({ data: { warehouseId: deps.almacen } })),
  component: RepartosRoute,
})

function RepartosRoute() {
  const overview = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return (
    <RepartosPage
      // A different warehouse starts with fresh dialogs.
      key={overview.selectedId ?? 'none'}
      overview={overview}
      onSelectWarehouse={(almacen) =>
        void navigate({ search: (current) => ({ ...current, almacen }) })
      }
    />
  )
}

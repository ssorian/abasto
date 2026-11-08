import { createFileRoute } from '@tanstack/react-router'
import { ExecutivePage } from '#/modules/executive/components/executive-page'
import { parseExecutiveSearch } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { loadExecutive } from '#/modules/executive/server/load-executive'

export const Route = createFileRoute('/direccion')({
  validateSearch: (search: Record<string, unknown>): ExecutiveSearch =>
    parseExecutiveSearch(search),
  loaderDeps: ({ search }) => search,
  // Staff never reach the server functions; the page shows the permission message.
  loader: ({ context, deps }) =>
    loadExecutive(deps, context.user?.role === 'owner'),
  component: function Direccion() {
    const navigate = Route.useNavigate()
    return (
      <ExecutivePage
        load={Route.useLoaderData()}
        search={Route.useSearch()}
        onSearch={(patch) =>
          void navigate({
            search: (current) => parseExecutiveSearch({ ...current, ...patch }),
          })
        }
      />
    )
  },
})

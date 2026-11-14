import { createFileRoute } from '@tanstack/react-router'

import { parseExecutiveSearch } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { ManagerReportsPage } from '#/modules/reports/components/manager/manager-reports-page'
import { OwnerReportsPage } from '#/modules/reports/components/owner/owner-reports-page'
import { parseManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import type { ManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import { loadManagerReports } from '#/modules/reports/server/load-manager-reports'
import { loadOwnerReports } from '#/modules/reports/server/load-owner-reports'

/** The owner and manager views share one URL; each reads only its own keys. */
type ReportsSearch = ManagerReportsSearch & ExecutiveSearch

const parseReportsSearch = (raw: Record<string, unknown>): ReportsSearch => ({
  ...parseManagerReportsSearch(raw),
  ...parseExecutiveSearch(raw),
})

export const Route = createFileRoute('/reportes')({
  validateSearch: parseReportsSearch,
  loaderDeps: ({ search }) => search,
  // One loader per role: a manager never reaches an owner server function.
  loader: async ({ context, deps }) =>
    context.user?.role === 'owner'
      ? ({ role: 'owner', load: await loadOwnerReports(deps) } as const)
      : ({ role: 'manager', load: await loadManagerReports(deps) } as const),
  component: ReportsRoute,
})

function ReportsRoute() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = Route.useRouteContext()
  const onSearch = (patch: Partial<ReportsSearch>) =>
    void navigate({
      search: (current) => parseReportsSearch({ ...current, ...patch }),
    })
  return data.role === 'owner' ? (
    <OwnerReportsPage
      load={data.load}
      search={search}
      onSearch={onSearch}
      userName={user?.name}
    />
  ) : (
    <ManagerReportsPage load={data.load} search={search} onSearch={onSearch} />
  )
}

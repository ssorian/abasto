import { createFileRoute } from '@tanstack/react-router'

import { ReportsPage } from '#/modules/reports/components/reports-page'
import { parseReportSearch } from '#/modules/reports/lib/search'
import type { ReportSearch } from '#/modules/reports/lib/search'
import { loadReport } from '#/modules/reports/server/load-report'

export const Route = createFileRoute('/reportes')({
  validateSearch: (search: Record<string, unknown>): ReportSearch =>
    parseReportSearch(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadReport(deps),
  component: ReportsRoute,
})

function ReportsRoute() {
  const load = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ReportsPage
      load={load}
      search={search}
      onSearch={(patch) =>
        void navigate({
          search: (current) => parseReportSearch({ ...current, ...patch }),
        })
      }
      onTab={(tab) => void navigate({ search: parseReportSearch({ tab }) })}
    />
  )
}

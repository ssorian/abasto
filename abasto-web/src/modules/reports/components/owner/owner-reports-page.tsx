import { DownloadIcon } from 'lucide-react'

import { metricsOf } from '#/modules/executive/lib/profitability'
import { executivePeriodOf } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { businessDate } from '#/modules/orders/services/clock'
import { ControlSummary } from '#/modules/reports/components/owner/control-summary'
import { InventoryRail } from '#/modules/reports/components/owner/inventory-rail'
import {
  ColumnHeading,
  Panel,
} from '#/modules/reports/components/owner/owner-panel'
import { OwnerToolbar } from '#/modules/reports/components/owner/owner-toolbar'
import { PeriodResult } from '#/modules/reports/components/owner/period-result'
import { SalesBreakdown } from '#/modules/reports/components/owner/sales-breakdown'
import { ActionButton } from '#/modules/reports/components/report-buttons'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { downloadText, salesCsv } from '#/modules/reports/lib/csv'
import {
  dailySeries,
  previousTotals,
  relativeChangeBps,
} from '#/modules/reports/lib/owner-series'
import {
  chartDays,
  comparisonNoun,
  periodHeading,
} from '#/modules/reports/lib/owner-view'
import { longRangeLabel } from '#/modules/reports/lib/period'
import type { OwnerReportsLoad } from '#/modules/reports/server/load-owner-reports'
import type { OwnerDashboardData } from '#/modules/reports/types/owner-dashboard'
import type { PeriodPreset } from '#/modules/reports/types/reports'

type OwnerReportsPageProps = {
  load: OwnerReportsLoad
  search: ExecutiveSearch
  onSearch: (patch: Partial<ExecutiveSearch>) => void
}

/**
 * Owner dashboard on one screen: the chosen period on the left, today's
 * inventory on a rail at the right.
 */
export function OwnerReportsPage({
  load,
  search,
  onSearch,
}: OwnerReportsPageProps) {
  if (!load.allowed) {
    return (
      <p className="text-sm text-ink-muted">
        No tienes permiso para esta acción.
      </p>
    )
  }
  const { data } = load
  const { preset } = executivePeriodOf(search)
  return (
    <>
      <OwnerToolbar
        preset={preset}
        search={search}
        warehouses={load.warehouses}
        suppliers={load.suppliers}
        onChange={onSearch}
        actions={
          data && (
            <ActionButton
              onClick={() =>
                downloadText(
                  salesCsv('day', data.sales.byDay),
                  `abasto-ventas-day-${data.sales.range.from}-${data.sales.range.to}.csv`,
                )
              }
            >
              <DownloadIcon size={16} />
              Exportar CSV
            </ActionButton>
          )
        }
      />
      {load.error && <ReportEmpty>{load.error}</ReportEmpty>}
      {data && (
        <div className="grid items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_352px]">
          <PeriodColumn data={data} preset={preset} search={search} />
          <InventoryRail
            inventory={data.inventory}
            nonMoving={data.nonMoving}
            stockAlerts={data.stockAlerts}
            onSearch={onSearch}
          />
        </div>
      )}
    </>
  )
}

function PeriodColumn({
  data,
  preset,
  search,
}: {
  data: OwnerDashboardData
  preset: PeriodPreset
  search: ExecutiveSearch
}) {
  const { margin, ranking } = data
  const current = metricsOf(
    margin.summary.revenueCents,
    margin.summary.costCents,
    margin.summary.orders,
  )
  const previous = previousTotals(ranking.rows)
  const days = dailySeries(
    { range: data.sales.range, rows: data.sales.byDay },
    { range: data.previousSales.range, rows: data.previousSales.byDay },
  )
  const noun = comparisonNoun(preset)
  return (
    <section
      aria-labelledby="reportes-periodo"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
    >
      <ColumnHeading
        id="reportes-periodo"
        title={periodHeading(preset, margin.range)}
        note={`comparado con ${noun === 'periodo anterior' ? '' : `${noun}, `}${longRangeLabel(ranking.previousRange, Number(margin.range.to.slice(0, 4)))}`}
      />
      {margin.summary.orders > 0 ? (
        <>
          <PeriodResult
            current={current}
            revenueChangeBps={relativeChangeBps(
              current.revenueCents,
              previous.revenueCents,
            )}
            comparedWith={noun}
            bars={
              days.length > 1 ? chartDays(preset, days, businessDate()) : []
            }
          />
          <SalesBreakdown margin={margin} />
        </>
      ) : (
        <Panel className="px-[22px] py-5 text-sm text-muted-foreground">
          No hay pedidos entregados en este periodo.
        </Panel>
      )}
      <ControlSummary
        cashCuts={data.cashCuts}
        supplierRecovery={data.supplierRecovery}
        supplierFiltered={Boolean(search.proveedor)}
        warehouseFiltered={Boolean(search.almacen)}
      />
    </section>
  )
}

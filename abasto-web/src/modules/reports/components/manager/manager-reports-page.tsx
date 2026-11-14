import { workspace } from '#/config/workspace'
import { unwrap } from '#/lib/boundary'
import { metricsOf } from '#/modules/executive/lib/profitability'
import { executivePeriodOf } from '#/modules/executive/lib/search'
import { businessDate } from '#/modules/orders/services/clock'
import { ManagerBreakdown } from '#/modules/reports/components/manager/manager-breakdown'
import { WarehouseTodayRail } from '#/modules/reports/components/manager/warehouse-today-rail'
import { ControlSummary } from '#/modules/reports/components/owner/control-summary'
import { DownloadMenu } from '#/modules/reports/components/owner/download-menu'
import {
  ColumnHeading,
  Panel,
} from '#/modules/reports/components/owner/owner-panel'
import { OwnerToolbar } from '#/modules/reports/components/owner/owner-toolbar'
import { PeriodResult } from '#/modules/reports/components/owner/period-result'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { downloadText, salesCsv } from '#/modules/reports/lib/csv'
import type { ManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import {
  dailySeries,
  relativeChangeBps,
} from '#/modules/reports/lib/owner-series'
import {
  chartDays,
  comparisonNoun,
  periodHeading,
} from '#/modules/reports/lib/owner-view'
import { pdfChoices } from '#/modules/reports/lib/pdf-choices'
import type { PdfChoice } from '#/modules/reports/lib/pdf-choices'
import { buildManagerPdfReport } from '#/modules/reports/lib/pdf-report'
import { longRangeLabel } from '#/modules/reports/lib/period'
import { managerDashboardFn } from '#/modules/reports/server/manager-reports'
import type { ManagerReportsLoad } from '#/modules/reports/server/load-manager-reports'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { PeriodPreset } from '#/modules/reports/types/reports'

type ManagerReportsPageProps = {
  load: ManagerReportsLoad
  search: ManagerReportsSearch
  /** Merges a change into the URL. */
  onSearch: (patch: Partial<ManagerReportsSearch>) => void
  /** Who is signed in; printed on the PDF reports. */
  userName?: string
}

/**
 * Reports of one warehouse the manager runs, on one screen: the chosen period
 * on the left, the warehouse right now on a rail at the right.
 */
export function ManagerReportsPage({
  load,
  search,
  onSearch,
  userName,
}: ManagerReportsPageProps) {
  if (!load.allowed) {
    return (
      <ReportEmpty>
        Los reportes son para el dueño y los encargados de almacén.
      </ReportEmpty>
    )
  }
  const { dashboard } = load
  const { preset } = executivePeriodOf(search)
  const supplier = load.suppliers.find((item) => item.id === search.proveedor)
  // The reports follow the warehouse and supplier on screen, not its period.
  const downloadPdf = async (choice: PdfChoice) => {
    const data = unwrap(
      await managerDashboardFn({
        data: {
          period: choice.period,
          warehouseId: search.almacen,
          supplierId: search.proveedor,
        },
      }),
    )
    const report = buildManagerPdfReport(choice.kind, data, {
      business: workspace.business.name,
      scope: [
        `Almacén ${data.warehouse.name}`,
        supplier && `Proveedor ${supplier.name}`,
      ]
        .filter(Boolean)
        .join(' · '),
      generatedAt: new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City',
      }).format(new Date()),
      generatedBy: userName,
    })
    const { downloadPdfReport } =
      await import('#/modules/reports/lib/pdf-render')
    await downloadPdfReport(report)
  }
  return (
    <>
      <OwnerToolbar
        title={
          dashboard ? `Reportes · ${dashboard.warehouse.name}` : 'Reportes'
        }
        preset={preset}
        search={search}
        warehouses={load.warehouses}
        managedWarehouseId={dashboard?.warehouse.id ?? search.almacen ?? ''}
        suppliers={load.suppliers}
        onChange={onSearch}
        actions={
          dashboard && (
            <DownloadMenu
              choices={pdfChoices(businessDate())}
              onPdf={downloadPdf}
              onCsv={() =>
                downloadText(
                  salesCsv('day', dashboard.sales.byDay),
                  `abasto-ventas-day-${dashboard.sales.range.from}-${dashboard.sales.range.to}.csv`,
                )
              }
            />
          )
        }
      />
      {load.error && <ReportEmpty>{load.error}</ReportEmpty>}
      {dashboard && (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_352px]">
          <PeriodColumn
            data={dashboard}
            preset={preset}
            supplierFiltered={Boolean(search.proveedor)}
          />
          <WarehouseTodayRail data={dashboard} />
        </div>
      )}
    </>
  )
}

function PeriodColumn({
  data,
  preset,
  supplierFiltered,
}: {
  data: ManagerDashboard
  preset: PeriodPreset
  supplierFiltered: boolean
}) {
  const { sales, previousSales } = data
  const current = metricsOf(
    sales.summary.revenueCents,
    sales.summary.costCents,
    sales.summary.orders,
  )
  const days = dailySeries(
    { range: sales.range, rows: sales.byDay },
    { range: previousSales.range, rows: previousSales.byDay },
  )
  const noun = comparisonNoun(preset)
  return (
    <section
      aria-labelledby="reportes-periodo"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
    >
      <ColumnHeading
        id="reportes-periodo"
        title={periodHeading(preset, sales.range)}
        note={`comparado con ${noun === 'periodo anterior' ? '' : `${noun}, `}${longRangeLabel(previousSales.range, Number(sales.range.to.slice(0, 4)))}`}
      />
      {sales.summary.orders > 0 ? (
        <>
          <PeriodResult
            current={current}
            revenueChangeBps={relativeChangeBps(
              current.revenueCents,
              previousSales.summary.revenueCents,
            )}
            comparedWith={noun}
            bars={
              days.length > 1 ? chartDays(preset, days, businessDate()) : []
            }
          />
          <ManagerBreakdown sales={sales} />
        </>
      ) : (
        <Panel className="px-[22px] py-5 text-sm text-muted-foreground">
          Sin ventas en {data.warehouse.name} en este periodo.
        </Panel>
      )}
      <ControlSummary
        cashCuts={data.cash}
        supplierFiltered={supplierFiltered}
        oneWarehouse
      />
    </section>
  )
}

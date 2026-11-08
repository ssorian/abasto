import { PageHeading } from '#/components/page-heading'
import { AgingTab } from '#/modules/reports/components/aging-tab'
import { CashTab } from '#/modules/reports/components/cash-tab'
import { PillTabs } from '#/modules/reports/components/pill-tabs'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { ReportFilters } from '#/modules/reports/components/report-filters'
import { SalesTab } from '#/modules/reports/components/sales-tab'
import { StockTab } from '#/modules/reports/components/stock-tab'
import type { ReportSearch } from '#/modules/reports/lib/search'
import type { ReportsLoad } from '#/modules/reports/server/load-report'
import type { ReportTab } from '#/modules/reports/types/reports'

const tabs: Array<{ value: ReportTab; label: string }> = [
  { value: 'ventas', label: 'Ventas y utilidad' },
  { value: 'cajas', label: 'Cortes de caja' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'cartera', label: 'Cartera' },
]

type ReportsPageProps = {
  load: ReportsLoad
  search: ReportSearch
  /** Merges a change into the URL; changing the tab resets the other filters. */
  onSearch: (patch: Partial<ReportSearch>) => void
  onTab: (tab: ReportTab) => void
}

export function ReportsPage({
  load,
  search,
  onSearch,
  onTab,
}: ReportsPageProps) {
  const tab = search.tab ?? 'ventas'
  return (
    <>
      <PageHeading
        title="Reportes"
        description="Ventas y utilidad, cortes de caja, inventario por atender y cartera."
      />
      {!load.allowed ? (
        <ReportEmpty>
          Los reportes son para el dueño y los encargados de almacén.
        </ReportEmpty>
      ) : (
        <>
          <PillTabs value={tab} options={tabs} onChange={onTab} />
          <ReportFilters
            tab={tab}
            search={search}
            warehouses={load.warehouses}
            range={
              load.data?.tab === 'ventas' || load.data?.tab === 'cajas'
                ? load.data.report.range
                : undefined
            }
            onChange={onSearch}
          />
          {load.error && <ReportEmpty>{load.error}</ReportEmpty>}
          {load.data?.tab === 'ventas' && (
            <SalesTab report={load.data.report} />
          )}
          {load.data?.tab === 'cajas' && <CashTab report={load.data.report} />}
          {load.data?.tab === 'inventario' && (
            <StockTab report={load.data.report} />
          )}
          {load.data?.tab === 'cartera' && (
            <AgingTab report={load.data.report} />
          )}
        </>
      )}
    </>
  )
}

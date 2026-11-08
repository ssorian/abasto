import { DownloadIcon } from 'lucide-react'

import { PageHeading } from '#/components/page-heading'
import { ActionButton } from '#/modules/reports/components/report-buttons'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { CashCutsCard } from '#/modules/reports/components/manager/cash-cuts-card'
import { ExpiringLotsCard } from '#/modules/reports/components/manager/expiring-lots-card'
import { LowStockCard } from '#/modules/reports/components/manager/low-stock-card'
import { ManagerAttention } from '#/modules/reports/components/manager/manager-attention'
import { ManagerFilters } from '#/modules/reports/components/manager/manager-filters'
import { ManagerKpis } from '#/modules/reports/components/manager/manager-kpis'
import { SalesByDayChart } from '#/modules/reports/components/manager/sales-by-day-chart'
import { SupplierOrdersCard } from '#/modules/reports/components/manager/supplier-orders-card'
import { TopProductsCard } from '#/modules/reports/components/manager/top-products-card'
import { downloadText, salesCsv } from '#/modules/reports/lib/csv'
import { shortDate } from '#/modules/reports/lib/manager-format'
import type { ManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import type { ManagerReportsLoad } from '#/modules/reports/server/load-manager-reports'

type ManagerReportsPageProps = {
  load: ManagerReportsLoad
  search: ManagerReportsSearch
  /** Merges a change into the URL. */
  onSearch: (patch: Partial<ManagerReportsSearch>) => void
}

/** Reports of the manager: what needs action in their warehouse, and how it sells. */
export function ManagerReportsPage({
  load,
  search,
  onSearch,
}: ManagerReportsPageProps) {
  if (!load.allowed) {
    return (
      <>
        <PageHeading
          title="Reportes"
          description="Tu almacén hoy y en el periodo. Primero lo que necesita acción."
        />
        <ReportEmpty>
          Los reportes son para el dueño y los encargados de almacén.
        </ReportEmpty>
      </>
    )
  }
  const { dashboard } = load
  const sales = dashboard?.sales
  return (
    <>
      <PageHeading
        title={
          dashboard ? `Reportes · ${dashboard.warehouse.name}` : 'Reportes'
        }
        description="Tu almacén hoy y en el periodo. Primero lo que necesita acción."
        actions={
          sales && (
            <ActionButton
              disabled={sales.byDay.length === 0}
              onClick={() =>
                downloadText(
                  salesCsv('day', sales.byDay),
                  `abasto-ventas-dia-${sales.range.from}-${sales.range.to}.csv`,
                )
              }
            >
              <DownloadIcon size={16} />
              Exportar CSV
            </ActionButton>
          )
        }
      />
      <ManagerFilters
        search={search}
        warehouses={load.warehouses}
        suppliers={load.suppliers}
        current={dashboard?.warehouse}
        range={sales?.range}
        onChange={onSearch}
      />
      {load.error && <ReportEmpty>{load.error}</ReportEmpty>}
      {dashboard && sales && (
        <div className="grid gap-[18px]">
          <ManagerAttention data={dashboard} />
          {sales.summary.orders === 0 ? (
            <ReportEmpty className="py-10">
              <strong className="text-sm text-ink-figure">
                Sin ventas en {dashboard.warehouse.name}
              </strong>
              <span className="text-[13px]">
                No hay pedidos entregados del {shortDate(sales.range.from)} al{' '}
                {shortDate(sales.range.to)}. Prueba con un periodo más largo.
              </span>
            </ReportEmpty>
          ) : (
            <>
              <ManagerKpis data={dashboard} />
              <div className="grid items-start gap-[18px] lg:grid-cols-[1.5fr_1fr]">
                <SalesByDayChart data={dashboard} />
                <LowStockCard rows={dashboard.stock.lowStock} />
              </div>
            </>
          )}
          <div className="grid items-start gap-[18px] lg:grid-cols-[1.3fr_1fr_1.2fr]">
            {sales.summary.orders === 0 && (
              <LowStockCard rows={dashboard.stock.lowStock} />
            )}
            <ExpiringLotsCard
              expiring={dashboard.stock.expiring}
              expired={dashboard.stock.expired}
              days={dashboard.stock.expiringDays}
            />
            {sales.summary.orders > 0 && (
              <TopProductsCard rows={sales.byProduct} />
            )}
            <SupplierOrdersCard orders={dashboard.pendingOrders} />
          </div>
          <CashCutsCard
            rows={dashboard.cash.rows}
            warehouse={dashboard.warehouse.name}
            supplierFiltered={Boolean(search.proveedor)}
          />
        </div>
      )}
    </>
  )
}

import { DownloadIcon } from 'lucide-react'

import { PageHeading } from '#/components/page-heading'
import { metricsOf } from '#/modules/executive/lib/profitability'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { CashSection } from '#/modules/reports/components/owner/cash-section'
import { IdleCapital } from '#/modules/reports/components/owner/idle-capital'
import { InventoryChart } from '#/modules/reports/components/owner/inventory-chart'
import { KpiCards } from '#/modules/reports/components/owner/kpi-cards'
import { OwnerPeriodFilters } from '#/modules/reports/components/owner/owner-period-filters'
import { ProfitBridge } from '#/modules/reports/components/owner/profit-bridge'
import { StockAlerts } from '#/modules/reports/components/owner/stock-alerts'
import { SupplierChart } from '#/modules/reports/components/owner/supplier-chart'
import { TopProductsChart } from '#/modules/reports/components/owner/top-products-chart'
import { TrendChart } from '#/modules/reports/components/owner/trend-chart'
import { WarehouseComparison } from '#/modules/reports/components/owner/warehouse-comparison'
import { ActionButton } from '#/modules/reports/components/report-buttons'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { downloadText, salesCsv } from '#/modules/reports/lib/csv'
import {
  cashSentence,
  idleCapitalSentence,
  supplierSentence,
  topProductSentence,
  warehouseSentence,
} from '#/modules/reports/lib/owner-narrative'
import {
  cashDifferenceSummary,
  dailySeries,
  previousTotals,
  stockAlertSummary,
  supplierShares,
  topProfitProducts,
} from '#/modules/reports/lib/owner-series'
import type { OwnerReportsLoad } from '#/modules/reports/server/load-owner-reports'

type OwnerReportsPageProps = {
  load: OwnerReportsLoad
  search: ExecutiveSearch
  onSearch: (patch: Partial<ExecutiveSearch>) => void
}

const topProducts = 10

/** Owner dashboard: profitability, comparisons, inventory and cash of the whole business. */
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
  const warehouseCount = data?.margin.warehouses.length
  return (
    <>
      <PageHeading
        title="Reportes"
        description={
          warehouseCount === undefined
            ? 'Todo el negocio. Ventas, utilidad e inventario a costo.'
            : `${search.almacen || search.proveedor ? 'Selección filtrada' : 'Todo el negocio'} · ${warehouseCount} ${warehouseCount === 1 ? 'almacén' : 'almacenes'}. Ventas, utilidad e inventario a costo.`
        }
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
      <OwnerPeriodFilters
        search={search}
        range={data?.margin.range}
        previousRange={data?.ranking.previousRange}
        warehouses={load.warehouses}
        suppliers={load.suppliers}
        onChange={onSearch}
      />
      {load.error && <ReportEmpty>{load.error}</ReportEmpty>}
      {data && <Dashboard data={data} search={search} onSearch={onSearch} />}
    </>
  )
}

type Data = NonNullable<Extract<OwnerReportsLoad, { allowed: true }>['data']>

function Dashboard({
  data,
  search,
  onSearch,
}: {
  data: Data
  search: ExecutiveSearch
  onSearch: (patch: Partial<ExecutiveSearch>) => void
}) {
  const { margin, ranking, inventory, nonMoving, stockAlerts } = data
  const current = metricsOf(
    margin.summary.revenueCents,
    margin.summary.costCents,
    margin.summary.orders,
  )
  const previous = previousTotals(ranking.rows)
  const hasSales = margin.summary.orders > 0
  const days = dailySeries(
    { range: data.sales.range, rows: data.sales.byDay },
    { range: data.previousSales.range, rows: data.previousSales.byDay },
  )
  const products = topProfitProducts(margin.byProduct, topProducts)
  const suppliers = supplierShares(margin.bySupplier)
  const cash = cashDifferenceSummary(data.cashCuts.rows)
  return (
    <div className="grid gap-[18px]">
      {hasSales ? (
        <>
          <KpiCards
            current={current}
            previous={previous}
            days={days}
            rows={ranking.rows}
          />
          <div className="grid items-start gap-[18px] min-[1100px]:grid-cols-[1.6fr_1fr]">
            <TrendChart days={days} />
            <ProfitBridge
              current={current}
              previous={previous}
              previousRange={ranking.previousRange}
            />
          </div>
          <div className="grid items-start gap-[18px] min-[1100px]:grid-cols-2">
            <WarehouseComparison
              rows={ranking.rows}
              sentence={warehouseSentence(ranking.rows)}
            />
            <TopProductsChart
              rows={products}
              sentence={topProductSentence(products[0])}
            />
          </div>
        </>
      ) : (
        <ReportEmpty>No hay pedidos entregados en este periodo.</ReportEmpty>
      )}
      <div className="grid items-start gap-[18px] min-[1100px]:grid-cols-3">
        {hasSales && (
          <SupplierChart
            suppliers={suppliers}
            sentence={supplierSentence(suppliers)}
          />
        )}
        <InventoryChart inventory={inventory} />
        <IdleCapital
          nonMoving={nonMoving}
          sentence={idleCapitalSentence(
            nonMoving.totalCents,
            inventory.totalCents,
            Boolean(search.almacen || search.proveedor),
          )}
          onChange={onSearch}
        />
      </div>
      <div className="grid items-start gap-[18px] min-[1100px]:grid-cols-[1.5fr_1fr]">
        <CashSection
          rows={data.cashCuts.rows}
          sentence={cashSentence(cash)}
          supplierFiltered={Boolean(search.proveedor)}
        />
        <StockAlerts
          summary={stockAlertSummary(stockAlerts)}
          expiredCount={stockAlerts.expired.length}
          expiringDays={stockAlerts.expiringDays}
        />
      </div>
    </div>
  )
}

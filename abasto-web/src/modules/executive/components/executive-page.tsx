import { PageHeading } from '#/components/page-heading'
import { InventorySection } from '#/modules/executive/components/inventory-section'
import { MarginSection } from '#/modules/executive/components/margin-section'
import { NonMovingSection } from '#/modules/executive/components/non-moving-section'
import { PeriodFilters } from '#/modules/executive/components/period-filters'
import { RankingSection } from '#/modules/executive/components/ranking-section'
import { formatBpsPercent } from '#/modules/executive/lib/format'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import type { ExecutiveLoad } from '#/modules/executive/server/load-executive'
import { formatCents } from '#/modules/pricing/lib/money'
import { MetricStrip } from '#/modules/reports/components/metric-strip'
import { ReportEmpty } from '#/modules/reports/components/report-empty'

type ExecutivePageProps = {
  load: ExecutiveLoad
  search: ExecutiveSearch
  onSearch: (patch: Partial<ExecutiveSearch>) => void
}

/** Owner console: profitability first, then inventory and idle capital. */
export function ExecutivePage({ load, search, onSearch }: ExecutivePageProps) {
  if (!load.allowed) {
    return (
      <p className="text-sm text-ink-muted">
        No tienes permiso para esta acción.
      </p>
    )
  }
  const { margin, ranking, inventory, nonMoving } = load
  return (
    <>
      <PageHeading
        title="Dirección"
        description="Rentabilidad de todo el negocio, inventario a costo y capital detenido."
      />
      <PeriodFilters
        search={search}
        range={margin?.range}
        onChange={onSearch}
      />
      {load.error && <ReportEmpty>{load.error}</ReportEmpty>}
      {margin && (
        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Ventas',
              value: formatCents(margin.summary.revenueCents),
              note: `${margin.summary.orders} pedidos entregados`,
            },
            { label: 'Costo', value: formatCents(margin.summary.costCents) },
            {
              label: 'Utilidad bruta',
              value: formatCents(margin.summary.marginCents),
            },
            {
              label: 'Margen',
              value: formatBpsPercent(margin.summary.marginBps),
            },
          ]}
        />
      )}
      {ranking && <RankingSection ranking={ranking} />}
      {margin && <MarginSection report={margin} />}
      {inventory && <InventorySection inventory={inventory} />}
      {nonMoving && (
        <NonMovingSection nonMoving={nonMoving} onChange={onSearch} />
      )}
    </>
  )
}

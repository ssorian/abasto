import { AgingView } from '#/modules/reports/components/aging-view'
import { LossesView } from '#/modules/reports/components/losses-view'
import { PillTabs } from '#/modules/reports/components/pill-tabs'
import { ReportIntro } from '#/modules/reports/components/report-intro'
import { StockFilters } from '#/modules/reports/components/stock-filters'
import { useStockFilters } from '#/modules/reports/hooks/use-stock-filters'
import { agingCsv, downloadText, lossesCsv } from '#/modules/reports/lib/csv'
import { rangeLabel } from '#/modules/reports/lib/period'
import { businessDate } from '#/lib/utils/format'

import type { StockView } from '#/modules/reports/hooks/use-stock-filters'
import type { SaleEvent, StockPosition } from '#/modules/reports/types/reports'

const viewOptions: Array<{ value: StockView; label: string }> = [
  { value: 'Bajas', label: 'Mermas y bajas' },
  { value: 'Inmovilizado', label: 'Sin movimiento' },
]

/** "Mermas y rotación": registered losses and stock that has not sold recently. */
export function StockReport({
  positions,
  sales,
}: {
  positions: Array<StockPosition>
  sales: Array<SaleEvent>
}) {
  const filters = useStockFilters(positions, sales)
  const isLosses = filters.view === 'Bajas'

  const exportCsv = () =>
    isLosses
      ? downloadText(
          lossesCsv(filters.losses),
          `abarroteros-bajas-${filters.range.from}-${filters.range.to}.csv`,
        )
      : downloadText(
          agingCsv(filters.slow),
          `abarroteros-sin-movimiento-${businessDate()}.csv`,
        )

  return (
    <div>
      <ReportIntro
        eyebrow="CONTROL DEL INVENTARIO"
        title="Lo que se pierde y lo que se queda."
        description="Costos de bajas registradas y existencias sin ventas recientes."
        exportDisabled={
          isLosses ? !filters.losses.length : !filters.slow.length
        }
        onExport={exportCsv}
      />
      <PillTabs
        value={filters.view}
        options={viewOptions}
        onChange={filters.setView}
        className="mb-[26px]"
      />
      <StockFilters filters={filters} />
      {isLosses ? (
        <LossesView
          rangeText={rangeLabel(filters.range)}
          rows={filters.losses}
          totals={filters.totals}
        />
      ) : (
        <AgingView rows={filters.slow} totals={filters.totals} />
      )}
    </div>
  )
}

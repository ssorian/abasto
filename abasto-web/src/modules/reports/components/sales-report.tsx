import { useState } from 'react'
import { toast } from 'sonner'

import { OperationDetailDialog } from '#/modules/reports/components/operation-detail-dialog'
import { OperationsTable } from '#/modules/reports/components/operations-table'
import { PeriodControls } from '#/modules/reports/components/period-controls'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import { ReportIntro } from '#/modules/reports/components/report-intro'
import {
  SampleSalesDialog,
  SensitiveOperationDialog,
} from '#/modules/reports/components/sample-dialogs'
import { SalesBreakdown } from '#/modules/reports/components/sales-breakdown'
import {
  SalesKpis,
  SalesReconciliation,
} from '#/modules/reports/components/sales-kpis'
import { useSalesFilters } from '#/modules/reports/hooks/use-sales-filters'
import { downloadText, salesCsv } from '#/modules/reports/lib/csv'

import type { useSalesData } from '#/modules/reports/hooks/use-sales-data'
import type { SaleEvent } from '#/modules/reports/types/reports'

/** "Ventas y utilidad": delivered sales from each lot to the gross profit. */
export function SalesReport({
  data,
}: {
  data: ReturnType<typeof useSalesData>
}) {
  const filters = useSalesFilters(data.sales)
  const [selected, setSelected] = useState<SaleEvent | null>(null)
  const [confirming, setConfirming] = useState(false)

  const exportCsv = () =>
    downloadText(
      salesCsv(filters.rows),
      `abarroteros-ventas-${filters.range.from}-${filters.range.to}.csv`,
    )

  return (
    <div>
      <ReportIntro
        eyebrow="VENTAS CONCRETADAS"
        title="De cada lote a tu resultado."
        description="Consulta ingresos y costos históricos de las ventas entregadas."
        exportDisabled={!filters.rows.length}
        onExport={exportCsv}
      />
      <PeriodControls filters={filters} />
      <SalesKpis summary={filters.summary} />
      <SalesReconciliation figures={filters.reconciliation} />
      <SalesBreakdown
        group={filters.group}
        groups={filters.groups}
        onGroupChange={filters.setGroup}
        onLoadSamples={() => setConfirming(true)}
      />
      {filters.rows.length > 0 && (
        <OperationsTable rows={filters.rows} onSelect={setSelected} />
      )}
      <ReportFootnote>
        Importes de demo en MXN sin impuestos. Las ventas se reconocen al
        confirmar la entrega; las devoluciones, en la fecha en que se registran.
        Los costos por pieza conservan decimales y sus totales se redondean al
        centavo. La utilidad bruta no descuenta reparto, comisiones, mermas ni
        otros gastos. Las cantidades pendientes o canceladas y los traslados no
        son ventas.
      </ReportFootnote>

      {selected && (
        <OperationDetailDialog
          event={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {confirming && (
        <SampleSalesDialog
          onClose={() => setConfirming(false)}
          onConfirm={data.stageSamples}
        />
      )}
      {data.staged && (
        <SensitiveOperationDialog
          review={data.staged.review}
          onClose={data.cancelSamples}
          onApprove={() => {
            if (!data.confirmSamples()) return
            toast.success('Ventas de ejemplo agregadas.')
            setConfirming(false)
            filters.showEverything()
          }}
        />
      )}
    </div>
  )
}

import { ReportCard } from '#/modules/reports/components/owner/chart-kit'
import { RiderShortfallsTable } from '#/modules/reports/components/rider-shortfalls-table'
import { riderShortfallSentence } from '#/modules/reports/lib/rider-shortfalls'
import type { RiderShortfallRow } from '#/modules/reports/types/reports'

/** "Faltantes de reparto" by rider across the filtered warehouses. */
export function RiderShortfallsSection({
  rows,
}: {
  rows: Array<RiderShortfallRow>
}) {
  return (
    <ReportCard
      title="Faltantes de reparto"
      sentence={riderShortfallSentence(rows)}
      description="Faltante o sobrante de cada repartidor: lo entregado menos lo vendido en repartos liquidados del periodo."
    >
      {rows.length > 0 && <RiderShortfallsTable rows={rows} showWarehouse />}
    </ReportCard>
  )
}

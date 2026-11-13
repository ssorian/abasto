import { DeltaText } from '#/modules/reports/components/owner/delta-text'
import { ReportCard } from '#/modules/reports/components/owner/chart-kit'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { formatDeltaBps } from '#/modules/executive/lib/format'
import type { WarehouseMetrics } from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import { longRangeLabel } from '#/modules/reports/lib/period'
import { relativeChangeBps } from '#/modules/reports/lib/owner-series'
import type { DateRange } from '#/modules/reports/types/reports'

const num = 'text-right tabular-nums'

const percentOf = (bps: number | null) =>
  bps === null ? '—' : `${(bps / 100).toFixed(1)} %`

/** Sales minus cost equals profit, this period against the previous one. */
export function ProfitBridge({
  current,
  previous,
  previousRange,
}: {
  current: WarehouseMetrics
  previous: WarehouseMetrics
  previousRange: DateRange
}) {
  const change = (now: number, before: number) => {
    const bps = relativeChangeBps(now, before)
    return { value: bps, label: formatDeltaBps(bps, '%') }
  }
  const sales = change(current.revenueCents, previous.revenueCents)
  const cost = change(current.costCents, previous.costCents)
  const profit = change(current.marginCents, previous.marginCents)
  const marginDelta =
    current.marginBps === null || previous.marginBps === null
      ? null
      : current.marginBps - previous.marginBps
  return (
    <ReportCard
      title="De ventas a utilidad"
      description="Lo que entra, lo que cuesta y lo que queda."
    >
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th>Concepto</Th>
              <Th className={num}>Periodo</Th>
              <Th className={num}>Anterior</Th>
              <Th className={num}>Cambio</Th>
            </tr>
          </thead>
          <tbody>
            <Row>
              <Td>Ventas</Td>
              <Td className={num}>{formatCents(current.revenueCents)}</Td>
              <Td className={num}>{formatCents(previous.revenueCents)}</Td>
              <Td className={num}>
                <DeltaText value={sales.value} label={sales.label} />
              </Td>
            </Row>
            <Row>
              <Td>Costo</Td>
              <Td className={num}>−{formatCents(current.costCents)}</Td>
              <Td className={num}>−{formatCents(previous.costCents)}</Td>
              <Td className={num}>
                {/* More cost is neither good nor bad on its own: no color. */}
                <DeltaText value={null} label={cost.label} />
              </Td>
            </Row>
            <Row>
              <Td className="font-semibold">Utilidad bruta</Td>
              <Td className={`${num} font-semibold`}>
                {formatCents(current.marginCents)}
              </Td>
              <Td className={num}>{formatCents(previous.marginCents)}</Td>
              <Td className={num}>
                <DeltaText value={profit.value} label={profit.label} />
              </Td>
            </Row>
            <Row>
              <Td>Margen</Td>
              <Td className={num}>{percentOf(current.marginBps)}</Td>
              <Td className={num}>{percentOf(previous.marginBps)}</Td>
              <Td className={num}>
                <DeltaText
                  value={marginDelta}
                  label={formatDeltaBps(marginDelta, 'pp')}
                />
              </Td>
            </Row>
          </tbody>
        </DataTable>
      </TableWrap>
      <p className="mt-3.5 text-xs text-ink-muted">
        Anterior: {longRangeLabel(previousRange)}, de la misma duración.
      </p>
    </ReportCard>
  )
}

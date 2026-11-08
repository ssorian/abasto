import { DeltaText } from '#/modules/executive/components/delta-text'
import {
  formatBpsPercent,
  formatDeltaBps,
  formatDeltaCents,
} from '#/modules/executive/lib/format'
import type { WarehouseRanking } from '#/modules/executive/types/profitability'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { SectionRow } from '#/modules/reports/components/section-row'
import { rangeLabel } from '#/modules/reports/lib/period'
import { formatCents } from '#/modules/pricing/lib/money'

const num = 'text-right'

/** Warehouses side by side, this period against the one right before it. */
export function RankingSection({ ranking }: { ranking: WarehouseRanking }) {
  return (
    <section className="mt-[26px]">
      <SectionRow
        title="Ranking de almacenes"
        description={`Contra ${rangeLabel(ranking.previousRange)}, el periodo anterior de la misma duración.`}
      />
      {ranking.rows.length === 0 ? (
        <ReportEmpty>No hay almacenes activos.</ReportEmpty>
      ) : (
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Almacén</Th>
                <Th className={num}>Ventas</Th>
                <Th className={num}>Utilidad</Th>
                <Th className={num}>Margen</Th>
                <Th className={num}>Pedidos</Th>
                <Th className={num}>Ticket promedio</Th>
              </tr>
            </thead>
            <tbody>
              {ranking.rows.map((row) => (
                <Row key={row.key}>
                  <Td>{row.name}</Td>
                  <Td className={num}>
                    {formatCents(row.current.revenueCents)}
                    <CellNote>
                      antes {formatCents(row.previous.revenueCents)} ·{' '}
                      <DeltaText
                        value={row.delta.revenueCents}
                        label={
                          row.delta.revenueChangeBps === null
                            ? formatDeltaCents(row.delta.revenueCents)
                            : formatDeltaBps(row.delta.revenueChangeBps, '%')
                        }
                      />
                    </CellNote>
                  </Td>
                  <Td className={num}>
                    {formatCents(row.current.marginCents)}
                    <CellNote>
                      antes {formatCents(row.previous.marginCents)} ·{' '}
                      <DeltaText
                        value={row.delta.marginCents}
                        label={formatDeltaCents(row.delta.marginCents)}
                      />
                    </CellNote>
                  </Td>
                  <Td className={num}>
                    {formatBpsPercent(row.current.marginBps)}
                    <CellNote>
                      antes {formatBpsPercent(row.previous.marginBps)} ·{' '}
                      <DeltaText
                        value={row.delta.marginBps}
                        label={formatDeltaBps(row.delta.marginBps, 'pp')}
                      />
                    </CellNote>
                  </Td>
                  <Td className={num}>
                    {row.current.tickets}
                    <CellNote>
                      antes {row.previous.tickets} ·{' '}
                      <DeltaText
                        value={row.delta.tickets}
                        label={
                          row.delta.tickets > 0
                            ? `+${row.delta.tickets}`
                            : String(row.delta.tickets)
                        }
                      />
                    </CellNote>
                  </Td>
                  <Td className={num}>
                    {formatCents(row.current.averageTicketCents)}
                    <CellNote>
                      antes {formatCents(row.previous.averageTicketCents)} ·{' '}
                      <DeltaText
                        value={row.delta.averageTicketCents}
                        label={formatDeltaCents(row.delta.averageTicketCents)}
                      />
                    </CellNote>
                  </Td>
                </Row>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </section>
  )
}

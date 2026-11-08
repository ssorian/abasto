import { formatCents } from '#/modules/pricing/lib/money'
import { MetricStrip } from '#/modules/reports/components/metric-strip'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import { StatusBadge } from '#/components/status-badge'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { TableSection } from '#/modules/reports/components/table-section'
import { cashCutsCsv, downloadText } from '#/modules/reports/lib/csv'
import type { CashCuts } from '#/modules/reports/types/reports'

const num = 'text-right'
const when = (date: Date) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))

/** Cash cut of every drawer shift: expected, counted and difference. */
export function CashTab({ report }: { report: CashCuts }) {
  const { totals, rows } = report
  return (
    <div>
      <MetricStrip
        items={[
          {
            label: 'Ventas en efectivo',
            value: formatCents(totals.salesCents),
            note: `${totals.sessions} turnos de caja`,
          },
          {
            label: 'Efectivo esperado',
            value: formatCents(totals.expectedCents),
          },
          {
            label: 'Diferencia de turnos cerrados',
            value: formatCents(totals.differenceCents),
            note: 'Negativo: faltó efectivo',
          },
        ]}
      />
      <TableSection
        title="Cortes de caja"
        description="Turnos abiertos en el periodo, uno por fila."
        count={rows.length}
        emptyText="No hay turnos de caja en este periodo."
        onExport={() =>
          downloadText(
            cashCutsCsv(rows),
            `abasto-cortes-${report.range.from}-${report.range.to}.csv`,
          )
        }
      >
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Turno</Th>
                <Th className={num}>Fondo</Th>
                <Th className={num}>Ventas</Th>
                <Th className={num}>Entradas</Th>
                <Th className={num}>Retiros</Th>
                <Th className={num}>Esperado</Th>
                <Th className={num}>Contado</Th>
                <Th className={num}>Diferencia</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.sessionId}>
                  <Td>
                    {row.warehouseName}{' '}
                    <StatusBadge tone={row.status === 'open' ? 'blue' : 'gray'}>
                      {row.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </StatusBadge>
                    <CellNote>
                      {when(row.openedAt)} · {row.openedByName}
                      {row.closedAt && row.closedByName
                        ? ` → ${when(row.closedAt)} · ${row.closedByName}`
                        : ''}
                    </CellNote>
                  </Td>
                  <Td className={num}>{formatCents(row.openingCents)}</Td>
                  <Td className={num}>{formatCents(row.salesCents)}</Td>
                  <Td className={num}>{formatCents(row.entriesCents)}</Td>
                  <Td className={num}>{formatCents(row.withdrawalsCents)}</Td>
                  <Td className={num}>{formatCents(row.expectedCents)}</Td>
                  <Td className={num}>
                    {row.countedCents === null
                      ? '—'
                      : formatCents(row.countedCents)}
                  </Td>
                  <Td className={num}>
                    {row.differenceCents === null
                      ? '—'
                      : formatCents(row.differenceCents)}
                  </Td>
                </Row>
              ))}
            </tbody>
            <tfoot>
              <Row className="font-semibold">
                <Td>Total</Td>
                <Td />
                <Td className={num}>{formatCents(totals.salesCents)}</Td>
                <Td colSpan={2} />
                <Td className={num}>{formatCents(totals.expectedCents)}</Td>
                <Td className={num}>{formatCents(totals.countedCents)}</Td>
                <Td className={num}>{formatCents(totals.differenceCents)}</Td>
              </Row>
            </tfoot>
          </DataTable>
        </TableWrap>
      </TableSection>
      <ReportFootnote>
        Esperado = fondo + ventas en efectivo + entradas − retiros. Los turnos
        abiertos muestran el esperado hasta ahora y no tienen diferencia. Los
        totales de contado y diferencia suman solo turnos cerrados.
      </ReportFootnote>
    </div>
  )
}

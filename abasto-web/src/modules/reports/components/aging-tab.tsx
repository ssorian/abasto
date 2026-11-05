import { formatCents } from '#/modules/pricing/lib/money'
import { MetricStrip } from '#/modules/reports/components/metric-strip'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { TableSection } from '#/modules/reports/components/table-section'
import { agingCsv, downloadText } from '#/modules/reports/lib/csv'
import type { ReceivablesAging } from '#/modules/reports/types/reports'

const num = 'text-right'

/** Receivables by days overdue, per customer. */
export function AgingTab({ report }: { report: ReceivablesAging }) {
  const { totals, rows } = report
  const overdue =
    totals.days1to30Cents + totals.days31to60Cents + totals.over60Cents
  return (
    <div>
      <MetricStrip
        items={[
          {
            label: 'Por cobrar',
            value: formatCents(totals.totalCents),
            note: `${totals.customers} clientes`,
          },
          { label: 'Al corriente', value: formatCents(totals.currentCents) },
          { label: 'Vencido', value: formatCents(overdue) },
        ]}
      />
      <TableSection
        title="Antigüedad de saldos"
        description={`Al ${report.asOf}, según los días de atraso de cada cargo.`}
        count={rows.length}
        emptyText="Ningún cliente tiene saldo pendiente."
        onExport={() =>
          downloadText(agingCsv(rows), `abasto-cartera-${report.asOf}.csv`)
        }
      >
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th className={num}>Al corriente</Th>
                <Th className={num}>1–30 días</Th>
                <Th className={num}>31–60 días</Th>
                <Th className={num}>Más de 60</Th>
                <Th className={num}>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.customerId}>
                  <Td>{row.name}</Td>
                  <Td className={num}>{formatCents(row.currentCents)}</Td>
                  <Td className={num}>{formatCents(row.days1to30Cents)}</Td>
                  <Td className={num}>{formatCents(row.days31to60Cents)}</Td>
                  <Td className={num}>{formatCents(row.over60Cents)}</Td>
                  <Td className={num}>{formatCents(row.totalCents)}</Td>
                </Row>
              ))}
            </tbody>
            <tfoot>
              <Row className="font-semibold">
                <Td>Total</Td>
                <Td className={num}>{formatCents(totals.currentCents)}</Td>
                <Td className={num}>{formatCents(totals.days1to30Cents)}</Td>
                <Td className={num}>{formatCents(totals.days31to60Cents)}</Td>
                <Td className={num}>{formatCents(totals.over60Cents)}</Td>
                <Td className={num}>{formatCents(totals.totalCents)}</Td>
              </Row>
            </tfoot>
          </DataTable>
        </TableWrap>
      </TableSection>
      <ReportFootnote>
        Los abonos se aplican a los cargos más antiguos primero. Un cargo es
        vencido desde el día siguiente a su fecha de vencimiento.
      </ReportFootnote>
    </div>
  )
}

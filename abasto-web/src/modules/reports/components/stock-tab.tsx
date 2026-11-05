import { formatCents } from '#/modules/pricing/lib/money'
import { MetricStrip } from '#/modules/reports/components/metric-strip'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { TableSection } from '#/modules/reports/components/table-section'
import { downloadText, lotsCsv, lowStockCsv } from '#/modules/reports/lib/csv'
import { businessDate } from '#/lib/utils/format'
import type { LotAlertRow, StockAlerts } from '#/modules/reports/types/reports'

const num = 'text-right'
const sumValue = (rows: Array<LotAlertRow>) =>
  rows.reduce((total, row) => total + row.valueCents, 0)

function LotsTable({
  rows,
  expired,
}: {
  rows: Array<LotAlertRow>
  expired: boolean
}) {
  return (
    <TableWrap bordered>
      <DataTable>
        <thead>
          <tr>
            <Th>Producto</Th>
            <Th>Lote</Th>
            <Th>Caduca</Th>
            <Th className={num}>Existencia</Th>
            <Th className={num}>Apartado</Th>
            <Th className={num}>Valor al costo</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.lotId}>
              <Td>
                {row.name}
                <CellNote>{row.warehouseName}</CellNote>
              </Td>
              <Td>{row.lotCode || '—'}</Td>
              <Td>
                {row.expiresOn}
                <CellNote>
                  {expired
                    ? `Hace ${-row.daysLeft} días`
                    : row.daysLeft === 0
                      ? 'Hoy'
                      : `En ${row.daysLeft} días`}
                </CellNote>
              </Td>
              <Td className={num}>
                {row.onHand} {row.unit}
              </Td>
              <Td className={num}>{row.reserved}</Td>
              <Td className={num}>{formatCents(row.valueCents)}</Td>
            </Row>
          ))}
        </tbody>
        <tfoot>
          <Row className="font-semibold">
            <Td>Total</Td>
            <Td colSpan={4} />
            <Td className={num}>{formatCents(sumValue(rows))}</Td>
          </Row>
        </tfoot>
      </DataTable>
    </TableWrap>
  )
}

/** Low stock, lots about to expire and units already expired. */
export function StockTab({ report }: { report: StockAlerts }) {
  const { lowStock, expiring, expired } = report
  const stamp = businessDate()
  return (
    <div>
      <MetricStrip
        items={[
          { label: 'Bajo el mínimo', value: String(lowStock.length) },
          {
            label: `Caducan en ${report.expiringDays} días`,
            value: String(expiring.length),
            note: `${formatCents(sumValue(expiring))} al costo`,
          },
          {
            label: 'Caducados con existencia',
            value: String(expired.length),
            note: `${formatCents(sumValue(expired))} al costo`,
          },
        ]}
      />
      <TableSection
        title="Bajo el mínimo"
        description="Unidades disponibles (sin apartados ni caducadas) menores al mínimo."
        count={lowStock.length}
        emptyText="Todos los productos con mínimo están cubiertos."
        onExport={() =>
          downloadText(lowStockCsv(lowStock), `abasto-bajo-minimo-${stamp}.csv`)
        }
      >
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th className={num}>Disponible</Th>
                <Th className={num}>Mínimo</Th>
                <Th className={num}>Faltan</Th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((row) => (
                <Row key={`${row.warehouseId}-${row.productId}`}>
                  <Td>
                    {row.name}
                    <CellNote>{row.warehouseName}</CellNote>
                  </Td>
                  <Td className={num}>
                    {row.available} {row.unit}
                  </Td>
                  <Td className={num}>{row.minimum}</Td>
                  <Td className={num}>{row.missing}</Td>
                </Row>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      </TableSection>
      <TableSection
        title="Por caducar"
        description={`Lotes con existencia que caducan en los próximos ${report.expiringDays} días.`}
        count={expiring.length}
        emptyText="Ningún lote caduca en este plazo."
        onExport={() =>
          downloadText(lotsCsv(expiring), `abasto-por-caducar-${stamp}.csv`)
        }
      >
        <LotsTable rows={expiring} expired={false} />
      </TableSection>
      <TableSection
        title="Caducados"
        description="Existencia de lotes cuya fecha de caducidad ya pasó; no se vende."
        count={expired.length}
        emptyText="No hay existencia caducada."
        onExport={() =>
          downloadText(lotsCsv(expired), `abasto-caducados-${stamp}.csv`)
        }
      >
        <LotsTable rows={expired} expired />
      </TableSection>
      <ReportFootnote>
        El valor al costo usa el costo por unidad de cada lote, redondeado al
        centavo por fila. Las fechas de caducidad son días de Ciudad de México.
      </ReportFootnote>
    </div>
  )
}

import { MetricStrip } from '#/modules/reports/components/metric-strip'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { ReportFootnote } from '#/modules/reports/components/report-footnote'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { formatMoney } from '#/modules/reports/lib/money'

import type { LossRow } from '#/modules/reports/types/reports'

type LossesViewProps = {
  rangeText: string
  rows: Array<LossRow>
  totals: { lossCents: number; movements: number; products: number }
}

/** "Mermas y bajas": cost of registered losses by reason and by movement. */
export function LossesView({ rangeText, rows, totals }: LossesViewProps) {
  const reasons = [...new Set(rows.map((row) => row.reason))]

  return (
    <>
      <div className="text-xs text-[#38597e]">
        {rangeText} · Ciudad de México
      </div>
      <MetricStrip
        items={[
          {
            label: 'Costo de las bajas y diferencias',
            value: formatMoney(totals.lossCents),
          },
          { label: 'Movimientos registrados', value: String(totals.movements) },
          { label: 'Productos afectados', value: String(totals.products) },
        ]}
      />
      <div className="my-4 flex flex-wrap gap-3">
        {reasons.map((reason) => (
          <div
            key={reason}
            className="grid gap-[5px] rounded-[10px] border border-[#dfe7f2] bg-white px-[18px] py-3.5"
          >
            <span className="text-[11px] text-[#7187a3]">{reason}</span>
            <b className="text-[17px] text-[#183b66]">
              {formatMoney(
                rows
                  .filter((row) => row.reason === reason)
                  .reduce((sum, row) => sum + row.costCents, 0),
              )}
            </b>
          </div>
        ))}
      </div>
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th>Fecha / referencia</Th>
              <Th>Producto / lote</Th>
              <Th>Motivo</Th>
              <Th>Cantidad</Th>
              <Th>Costo histórico</Th>
              <Th>Responsable</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.id}>
                <Td>
                  {row.date}
                  <CellNote>{row.ref}</CellNote>
                </Td>
                <Td>
                  {row.name}
                  <CellNote>
                    {row.lot} · {row.warehouse}
                  </CellNote>
                </Td>
                <Td>
                  {row.reason}
                  <CellNote>{row.note}</CellNote>
                </Td>
                <Td>
                  {row.quantity} {row.unit}
                </Td>
                <Td>{formatMoney(row.costCents)}</Td>
                <Td>{row.actor}</Td>
              </Row>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
      {!rows.length && (
        <ReportEmpty>
          No hay bajas con estos filtros. Registra una baja por lote o una
          diferencia de conteo en Inventario.
        </ReportEmpty>
      )}
      <ReportFootnote>
        Sólo incluye salidas manuales, ajustes negativos y faltantes de
        traslados cerrados. Ventas, devoluciones y traslados normales no son
        mermas. Las devoluciones dañadas se consideran pérdida cuando se
        registra su baja, evitando contarlas dos veces. Otras salidas manuales
        requieren revisar su motivo; no todas representan una pérdida.
      </ReportFootnote>
    </>
  )
}

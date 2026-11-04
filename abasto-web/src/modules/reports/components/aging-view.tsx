import { businessDate } from '#/lib/utils/format'
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

import type { AgingRow } from '#/modules/reports/types/reports'

type AgingViewProps = {
  rows: Array<AgingRow>
  totals: { immobileCents: number; blockedCents: number; expiringCents: number }
}

/** "Sin movimiento": stock value without recent sales, plus blocked and expiring stock. */
export function AgingView({ rows, totals }: AgingViewProps) {
  return (
    <>
      <div className="text-xs text-[#38597e]">
        Existencias actuales al {businessDate()} · Se usa el historial
        registrado en esta demo.
      </div>
      <MetricStrip
        items={[
          {
            label: 'Valor sin venta reciente',
            value: formatMoney(totals.immobileCents),
            note: `${rows.length} productos / almacenes`,
          },
          {
            label: 'Bloqueado o vencido',
            value: formatMoney(totals.blockedCents),
            note: 'Todo el inventario filtrado; aún sin baja',
          },
          {
            label: 'Vendible que vence en 30 días',
            value: formatMoney(totals.expiringCents),
            note: 'Todo el inventario filtrado',
          },
        ]}
      />
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th>Producto / almacén</Th>
              <Th>Existencias</Th>
              <Th>Valor al costo</Th>
              <Th>Última venta</Th>
              <Th>Tiempo observado</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={`${row.productId}-${row.warehouse}`}>
                <Td>
                  {row.name}
                  <CellNote>
                    {row.warehouse} · {row.sku}
                  </CellNote>
                </Td>
                <Td>
                  {row.quantity} {row.unit}
                  <CellNote>{row.reserved} reservadas</CellNote>
                </Td>
                <Td>
                  <b>{formatMoney(row.valueCents)}</b>
                </Td>
                <Td>{row.lastSale || 'Sin ventas registradas'}</Td>
                <Td>
                  {row.days} días
                  <CellNote>
                    {row.lastSale
                      ? 'Desde la última venta'
                      : `Desde la primera entrada conocida: ${row.firstKnown || 'Sin fecha'}`}
                  </CellNote>
                </Td>
              </Row>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
      {!rows.length && (
        <ReportEmpty>
          No hay productos con ese tiempo observado. Prueba un umbral menor.
        </ReportEmpty>
      )}
      <ReportFootnote>
        La antigüedad se mide desde la última venta entregada por producto y
        almacén; una devolución no reinicia el plazo. Sin ventas registradas se
        usa la primera entrada conocida, sin asumir que el historial anterior
        está completo. El valor retenido, el bloqueado y el próximo a caducar
        pueden coincidir: no se suman entre sí ni se cuentan como pérdidas
        realizadas.
      </ReportFootnote>
    </>
  )
}

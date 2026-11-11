import { formatCents } from '#/modules/pricing/lib/money'
import {
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { riderNetLabel } from '#/modules/reports/lib/rider-shortfalls'
import type { RiderShortfallRow } from '#/modules/reports/types/reports'

/** Net shortage or surplus of each rider for the period (shared by manager and owner). */
export function RiderShortfallsTable({
  rows,
  showWarehouse = false,
}: {
  rows: ReadonlyArray<RiderShortfallRow>
  showWarehouse?: boolean
}) {
  return (
    <TableWrap bordered>
      <DataTable>
        <thead>
          <tr>
            <Th>Repartidor</Th>
            {showWarehouse && <Th>Almacén</Th>}
            <Th className="text-right">Repartos</Th>
            <Th className="text-right">Faltante</Th>
            <Th className="text-right">Sobrante</Th>
            <Th className="text-right">Neto</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={`${row.riderId}-${row.warehouseId}`}>
              <Td className="first:min-w-0">{row.riderName}</Td>
              {showWarehouse && <Td>{row.warehouseName}</Td>}
              <Td className="text-right tabular-nums">{row.deliveries}</Td>
              <Td className="text-right tabular-nums">
                {formatCents(row.shortfallCents)}
              </Td>
              <Td className="text-right tabular-nums">
                {formatCents(row.surplusCents)}
              </Td>
              <Td className="text-right font-semibold tabular-nums">
                {formatCents(row.netCents)}
              </Td>
              <Td>{riderNetLabel(row.netCents)}</Td>
            </Row>
          ))}
        </tbody>
      </DataTable>
    </TableWrap>
  )
}

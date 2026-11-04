import { ArrowRightIcon } from 'lucide-react'

import { StatusBadge } from '#/components/status-badge'
import { IconButton } from '#/modules/reports/components/report-buttons'
import { SectionRow } from '#/modules/reports/components/section-row'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { businessDate } from '#/lib/utils/format'
import { formatMoney } from '#/modules/reports/lib/money'
import { eventAmounts } from '#/modules/reports/lib/sales'

import type { SaleEvent } from '#/modules/reports/types/reports'

/** "Operaciones que forman el total": each sale or return with a link to its detail. */
export function OperationsTable({
  rows,
  onSelect,
}: {
  rows: Array<SaleEvent>
  onSelect: (event: SaleEvent) => void
}) {
  return (
    <section className="mt-[31px]">
      <SectionRow
        title="Operaciones que forman el total"
        description="Abre una partida para consultar el precio y costo originales."
      />
      <TableWrap bordered>
        <DataTable>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Operación</Th>
              <Th>Producto / lote</Th>
              <Th>Cantidad</Th>
              <Th>Venta neta</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <Row key={event.id}>
                <Td className="text-xs">
                  {businessDate(new Date(event.date))}
                </Td>
                <Td className="text-xs">
                  <StatusBadge
                    tone={event.type === 'Venta' ? 'green' : 'amber'}
                  >
                    {event.type}
                  </StatusBadge>
                  <CellNote>{event.orderId}</CellNote>
                </Td>
                <Td className="text-xs">
                  {event.productName}
                  <CellNote>
                    {event.lot || 'Sin lote'} · {event.warehouse}
                  </CellNote>
                </Td>
                <Td className="text-xs">
                  {event.type === 'Devolución' ? '−' : ''}
                  {event.quantity} {event.unit}
                </Td>
                <Td className="text-xs">
                  {formatMoney(eventAmounts(event).net)}
                </Td>
                <Td className="text-xs">
                  <IconButton
                    aria-label={`Ver operación ${event.id}`}
                    onClick={() => onSelect(event)}
                  >
                    <ArrowRightIcon size={16} />
                  </IconButton>
                </Td>
              </Row>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
    </section>
  )
}

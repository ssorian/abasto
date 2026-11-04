import { ChartColumnIcon, PlusIcon } from 'lucide-react'

import { ActionButton } from '#/modules/reports/components/report-buttons'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { SectionRow } from '#/modules/reports/components/section-row'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import { cn } from '#/lib/utils/cn'
import { groupHeadings, groupOptions } from '#/modules/reports/lib/constants'
import { formatMoney } from '#/modules/reports/lib/money'

import type { GroupMode, SalesGroup } from '#/modules/reports/types/reports'

type SalesBreakdownProps = {
  group: GroupMode
  groups: Array<SalesGroup>
  onGroupChange: (group: GroupMode) => void
  onLoadSamples: () => void
}

/** "Desglose del periodo": net sales, cost and profit per product, lot, warehouse or channel. */
export function SalesBreakdown({
  group,
  groups,
  onGroupChange,
  onLoadSamples,
}: SalesBreakdownProps) {
  return (
    <section className="mt-[25px]">
      <SectionRow
        title="Desglose del periodo"
        description="Las cantidades se muestran en su unidad de manejo."
      >
        <select
          aria-label="Agrupar reporte"
          value={group}
          onChange={(event) => onGroupChange(event.target.value as GroupMode)}
          className="w-full rounded-[7px] border border-[#dae4ef] bg-white px-3 py-2.5 text-[13px] text-[#486784] md:w-auto md:max-w-[190px] md:text-xs"
        >
          {groupOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SectionRow>

      {groups.length ? (
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>{groupHeadings[group]}</Th>
                <Th>Cantidad neta</Th>
                <Th>Ventas netas</Th>
                <Th>Costo neto</Th>
                <Th>Utilidad bruta</Th>
                <Th>Margen</Th>
              </tr>
            </thead>
            <tbody>
              {groups.map((item) => (
                <Row key={item.key}>
                  <Td className="text-xs">
                    <strong>{item.name}</strong>
                    {group === 'lot' && (
                      <CellNote>{item.rows[0].receiptId}</CellNote>
                    )}
                  </Td>
                  <Td className="text-xs">{item.units}</Td>
                  <Td className="text-xs">{formatMoney(item.summary.net)}</Td>
                  <Td className="text-xs">{formatMoney(item.summary.cost)}</Td>
                  <Td
                    className={cn(
                      'text-xs',
                      item.summary.profit < 0
                        ? 'text-[#c35850]'
                        : 'text-[#198567]',
                    )}
                  >
                    {formatMoney(item.summary.profit)}
                  </Td>
                  <Td className="text-xs">
                    {item.summary.margin === null
                      ? '—'
                      : `${item.summary.margin.toFixed(1)}%`}
                  </Td>
                </Row>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      ) : (
        <ReportEmpty>
          <ChartColumnIcon size={36} />
          <h3 className="text-[19px] text-[#294b73]">
            No hay ventas entregadas en este periodo
          </h3>
          <p className="max-w-[470px] text-sm leading-[1.7]">
            Cambia las fechas o confirma una entrega en Mostrador → Ventas y
            entregas. También puedes cargar ejemplos para explorar el reporte.
          </p>
          <ActionButton className="mt-[5px]" onClick={onLoadSamples}>
            <PlusIcon size={16} />
            Cargar ventas de ejemplo
          </ActionButton>
        </ReportEmpty>
      )}
    </section>
  )
}

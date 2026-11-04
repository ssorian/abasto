import { allocationTotal, amountFor } from '#/modules/counter/lib/amounts'
import { formatMoney } from '#/modules/counter/lib/money'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'

import type { Allocation } from '#/modules/counter/types/counter'

const headerCell = 'p-3 text-[10px] md:p-3'
const bodyCell = 'p-3 text-xs md:p-3'

/** Per-lot price table of an order line, with the agreed total. */
export function PriceBreakdown({
  rows,
  unit,
}: {
  rows: Array<Allocation>
  unit: string
}) {
  return (
    <div className="my-[14px] overflow-hidden rounded-[11px] border border-[#e2e9f1]">
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th className={headerCell}>Lote / recepción</Th>
              <Th className={headerCell}>Cantidad</Th>
              <Th className={headerCell}>Costo unitario</Th>
              <Th className={headerCell}>Precio por presentación</Th>
              <Th className={headerCell}>Precio neto</Th>
              <Th className={headerCell}>Importe</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <Td className={`${bodyCell} first:min-w-[125px]`}>
                  {a.lot}
                  <CellNote>{a.lotId}</CellNote>
                </Td>
                <Td className={bodyCell}>
                  {a.qty} {unit}
                </Td>
                <Td className={bodyCell}>{formatMoney(a.costPerUnitCents)}</Td>
                <Td className={bodyCell}>
                  {formatMoney(a.unitPriceCents)}
                  <CellNote>
                    {a.presentationName} · {a.priceFactor} {unit}
                  </CellNote>
                </Td>
                <Td className={bodyCell}>{formatMoney(a.unitPriceCents)}</Td>
                <Td className={bodyCell}>
                  <strong>{formatMoney(amountFor(a, a.qty))}</strong>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableWrap>
      <div className="flex justify-between gap-[18px] border-t border-[#e2e9f1] bg-[#f7faff] px-[17px] py-[15px] text-[13px]">
        <span>Total acordado</span>
        <strong className="text-[22px] text-[#143563] md:text-xl">
          {formatMoney(allocationTotal(rows))}
        </strong>
      </div>
    </div>
  )
}

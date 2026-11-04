import { RotateCcwIcon } from 'lucide-react'

import {
  InfoPairs,
  SectionHelp,
  SignedQuantity,
} from '#/modules/inventory/components/info-blocks'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import { ProductThumb } from '#/modules/inventory/components/product-thumb'
import {
  DataTable,
  TableWrap,
  Td,
  Th,
  CellNote,
} from '#/modules/inventory/components/data-table'
import { requireProduct } from '#/modules/inventory/lib/catalog'
import { dateLabel, money, timeLabel } from '#/modules/inventory/lib/format'

import type { Movement } from '#/modules/inventory/types/inventory'

/** Lots behind a movement with their historical cost. */
function Trace({ movement }: { movement: Movement }) {
  const lots = movement.allocations ?? []
  const total = lots.reduce((sum, lot) => sum + lot.qty * lot.cost, 0)

  return (
    <div className="mt-2 border-t border-[#e1e8f0] pt-5">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        <RotateCcwIcon size={17} />
        Trazabilidad del movimiento
      </h3>
      {lots.length ? (
        <>
          <TableWrap className="mt-3">
            <DataTable>
              <thead>
                <tr>
                  {['Lote', 'Cantidad', 'Costo unitario', 'Importe'].map(
                    (head) => (
                      <Th key={head}>{head}</Th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, index) => (
                  <tr key={index}>
                    <Td>
                      {lot.lot || 'Sin lote'}
                      <CellNote>
                        {lot.expiry ? `Cad. ${lot.expiry}` : 'Sin caducidad'}
                      </CellNote>
                    </Td>
                    <Td>{lot.qty}</Td>
                    <Td>{money(lot.cost)}</Td>
                    <Td>{money(lot.qty * lot.cost)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
          <div className="my-3.5 flex justify-between gap-[18px] text-[13px]">
            <span>Costo histórico del movimiento</span>
            <strong className="text-xl text-[#143563]">{money(total)}</strong>
          </div>
          <SectionHelp className="my-2 text-xs leading-[1.8]">
            Estos costos se conservan aunque cambien las próximas entradas.
          </SectionHelp>
        </>
      ) : (
        <SectionHelp className="my-2 text-xs leading-[1.8]">
          Este movimiento no modifica cantidades por lote.
        </SectionHelp>
      )}
      <small className="text-[#788596]">
        Registró: {movement.actor || 'Carga de demo'}
      </small>
    </div>
  )
}

export function MovementDetailDialog({
  movement,
  onClose,
}: {
  movement: Movement
  onClose: () => void
}) {
  const product = requireProduct(movement.productId)
  const rows: Array<[string, string]> = [
    ['Almacén', movement.warehouse],
    ['Fecha', `${dateLabel(movement.date)} · ${timeLabel(movement.date)}`],
  ]
  if (movement.cost !== undefined)
    rows.push(['Costo unitario de entrada', money(movement.cost)])
  if (movement.lot) rows.push(['Lote', movement.lot])
  if (movement.expiry) rows.push(['Caducidad', dateLabel(movement.expiry)])
  rows.push(['Referencia', movement.ref || '—'], ['Detalle', movement.note])

  return (
    <InventoryDialog
      title={movement.type}
      description="Detalle del movimiento"
      onClose={onClose}
    >
      <div className="flex items-center gap-[17px]">
        <div className="h-20 w-[58px] shrink-0">
          <ProductThumb product={product} />
        </div>
        <div>
          <h3 className="text-base font-semibold md:text-[17px]">
            {product.name}
          </h3>
          <p className="mt-1.5 text-xs text-[#8d9bad]">{product.description}</p>
        </div>
        <strong className="ml-auto text-[26px] md:text-[30px]">
          <SignedQuantity qty={movement.qty} />
        </strong>
      </div>
      <InfoPairs rows={rows} />
      <Trace movement={movement} />
    </InventoryDialog>
  )
}

import { ShoppingBag, Trash2 } from 'lucide-react'

import { allocationTotal } from '#/modules/counter/lib/amounts'
import { formatMoney } from '#/modules/counter/lib/money'
import {
  activePresentations,
  defaultPresentation,
  isBlocked,
  lotsFor,
  presentationFor,
  requireProduct,
} from '#/modules/counter/lib/stock'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import {
  CompactSelect,
  hideSpinners,
} from '#/modules/counter/components/form-controls'
import { EmptyState } from '#/modules/counter/components/empty-state'

import type { OrderComposer } from '#/modules/counter/hooks/use-order-composer'
import type { CounterState } from '#/modules/counter/types/counter'

const quantityInput = `w-[76px] rounded-lg border border-[#dee4dc] bg-white px-2.5 py-[9px] ${hideSpinners}`

/** Order lines with presentation, quantity, lot and amount per line. */
export function CartTable({
  composer,
  state,
}: {
  composer: OrderComposer
  state: CounterState
}) {
  return (
    <div className="rounded-xl border border-[#e2e7e0] bg-white">
      <TableWrap>
        <DataTable>
          <thead>
            <tr>
              <Th>Producto / presentación</Th>
              <Th>Cantidad</Th>
              <Th>Lote para surtir</Th>
              <Th>Importe</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {composer.lines.map((line) => {
              const product = requireProduct(line.productId)
              const presentation = presentationFor(product, line.presentationId)
              const quote = composer.quoted.find(
                (item) => item.productId === line.productId,
              )
              const bulk = defaultPresentation(product)
              const lots = lotsFor(
                state,
                product.id,
                composer.warehouse,
              ).filter(
                (lot) => !isBlocked(lot) && lot.quantity - lot.reserved > 0,
              )

              return (
                <tr key={line.productId} className="align-top">
                  <Td className="align-top">
                    <strong>{product.name}</strong>
                    <CellNote>
                      {product.description} · {product.baseUnit}
                    </CellNote>
                  </Td>
                  <Td className="align-top">
                    <div className="flex max-w-[220px] min-w-[150px] flex-col gap-[9px] md:min-w-[165px]">
                      <CompactSelect
                        aria-label={`Presentación de ${product.name}`}
                        value={presentation.id}
                        className="w-full p-2 text-[11px]"
                        onChange={(event) =>
                          composer.patchLine(product.id, {
                            presentationId: event.target.value,
                            looseQty: 0,
                          })
                        }
                      >
                        {activePresentations(product).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} · {option.factor} {product.baseUnit}
                          </option>
                        ))}
                      </CompactSelect>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Cantidad de ${product.name}`}
                        className={quantityInput}
                        value={line.qty || ''}
                        onChange={(event) =>
                          composer.patchLine(product.id, {
                            qty: Number(event.target.value),
                          })
                        }
                      />
                      {presentation.factor > 1 && (
                        <label className="flex items-center gap-[9px] text-[10px] text-[#7b8da3]">
                          + {product.baseUnit} sueltas
                          <input
                            type="number"
                            min="0"
                            step="1"
                            aria-label={`Sueltas de ${product.name}`}
                            className={quantityInput}
                            value={line.looseQty || ''}
                            onChange={(event) =>
                              composer.patchLine(product.id, {
                                looseQty: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      )}
                      <small className="mt-1 text-[10px] text-[#8095ad]">
                        Total: {line.qty * presentation.factor + line.looseQty}{' '}
                        {product.baseUnit}
                      </small>
                    </div>
                  </Td>
                  <Td className="align-top">
                    <CompactSelect
                      aria-label={`Lote de ${product.name}`}
                      className="w-full max-w-[275px]"
                      value={line.lotId ?? ''}
                      onChange={(event) =>
                        composer.patchLine(product.id, {
                          lotId: event.target.value || undefined,
                        })
                      }
                    >
                      <option value="">FEFO · caducidad más próxima</option>
                      {lots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.code} · {lot.quantity - lot.reserved} disp. ·{' '}
                          {formatMoney(lot.salePriceCents ?? bulk.priceCents)}
                        </option>
                      ))}
                    </CompactSelect>
                    {quote?.allocations.map((a) => (
                      <CellNote key={a.id}>
                        {Number((a.qty / a.priceFactor).toFixed(4))}{' '}
                        {a.presentationName} × {formatMoney(a.unitPriceCents)} ·{' '}
                        {a.lot}
                      </CellNote>
                    ))}
                  </Td>
                  <Td className="align-top">
                    <strong>
                      {quote
                        ? formatMoney(allocationTotal(quote.allocations))
                        : '—'}
                    </strong>
                  </Td>
                  <Td className="align-top">
                    <button
                      type="button"
                      aria-label={`Quitar ${product.name}`}
                      onClick={() => composer.removeLine(product.id)}
                      className="inline-flex size-9 items-center justify-center rounded-[7px] text-[#64758a] hover:bg-[#e9eff6]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      </TableWrap>
      {!composer.lines.length && (
        <EmptyState icon={<ShoppingBag size={26} />}>
          Agrega los productos del pedido.
        </EmptyState>
      )}
    </div>
  )
}

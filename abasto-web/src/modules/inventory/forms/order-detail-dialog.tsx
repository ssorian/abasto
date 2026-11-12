import { useEffect, useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import {
  orderDetailNotes,
  orderDetailRow,
} from '#/modules/inventory/lib/order-detail-rows'
import { boxCountLabel } from '#/modules/inventory/lib/order-rows'
import type {
  SupplierOrder,
  SupplierOrderSummary,
} from '#/modules/inventory/services/supplier-orders'

type OrderDetailDialogProps = {
  order: SupplierOrderSummary
  onClose: () => void
}

const priceTone = { up: 'text-[#b26a00]', down: 'text-[#2e7d4f]' } as const

/** Read-only view of an order: what was ordered, what arrived and the price charged. */
export function OrderDetailDialog({ order, onClose }: OrderDetailDialogProps) {
  const actions = useInventoryActions()
  const [detail, setDetail] = useState<SupplierOrder>()

  useEffect(() => {
    let current = true
    void actions.loadOrder(order.id).then((loaded) => {
      if (!current) return
      if (!loaded) return onClose()
      setDetail(loaded)
    })
    return () => {
      current = false
    }
  }, [order.id])

  const notes = detail ? orderDetailNotes(detail) : null
  const received = detail?.status === 'Recibido'
  const count = (boxes: number | null, factor: number) =>
    boxes === null ? '—' : boxCountLabel(boxes, factor)

  return (
    <InventoryDialog
      title="Detalle del pedido"
      eyebrow={order.supplierName.toUpperCase()}
      description={`${order.code} · ${order.status}`}
      size="wide"
      onClose={onClose}
    >
      {!detail ? (
        <p className="py-6 text-center text-sm text-[#907e84]">Cargando…</p>
      ) : (
        <div className="grid gap-4">
          <ListPanel className="max-h-[360px] overflow-auto group-data-maximized/dialog:max-h-none">
            <ListTable className="min-w-[860px]">
              <ListHead>
                {[
                  'Producto',
                  'Pedidas',
                  'Buenas',
                  'Faltantes',
                  'Dañadas',
                  'Costo por pieza',
                  'Total',
                ]}
              </ListHead>
              <ListBody>
                {detail.lines.map((line) => {
                  const row = orderDetailRow(line)
                  const factor = line.boxFactor
                  return (
                    <ListRow key={row.id} className="align-top">
                      <ListCell>
                        <strong>{row.productName}</strong>
                        <small className="block text-[#907e84]">
                          {row.sku}
                        </small>
                        {!row.ordered && (
                          <small className="mt-1 inline-block rounded-full bg-[#f3e9d7] px-2 py-0.5 text-[11px] font-[650] text-[#7a5a14]">
                            Sin pedido
                          </small>
                        )}
                      </ListCell>
                      <ListCell>{count(row.orderedBoxes, factor)}</ListCell>
                      <ListCell>{count(row.goodBoxes, factor)}</ListCell>
                      <ListCell>{count(row.missingBoxes, factor)}</ListCell>
                      <ListCell>{count(row.damagedBoxes, factor)}</ListCell>
                      <ListCell>
                        <strong
                          className={
                            row.priceDelta ? priceTone[row.priceDelta] : ''
                          }
                        >
                          ${row.pricePerPieceText}
                        </strong>
                        {row.orderedPriceText && (
                          <small className="block text-[#907e84]">
                            Pedido a ${row.orderedPriceText}
                          </small>
                        )}
                      </ListCell>
                      <ListCell>
                        <strong>{formatCents(row.totalCents)}</strong>
                      </ListCell>
                    </ListRow>
                  )
                })}
              </ListBody>
            </ListTable>
          </ListPanel>

          {received && notes && (notes.repriced > 0 || notes.unordered > 0) && (
            <p className="text-xs text-[#907e84]">
              {[
                notes.repriced > 0 &&
                  `${notes.repriced} con precio distinto al pedido`,
                notes.unordered > 0 && `${notes.unordered} sin pedido`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          <p className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-[#5f4a51]">
            <span>
              Total del pedido{' '}
              <strong>{formatCents(detail.totalCostCents)}</strong>
            </span>
            {detail.discountCents > 0 && (
              <span>
                Descuento por faltantes{' '}
                <strong>−{formatCents(detail.discountCents)}</strong>
              </span>
            )}
            <span>
              A pagar <strong>{formatCents(detail.payableCents)}</strong>
            </span>
          </p>

          <DialogActions>
            <ActionButton type="button" tone="primary" onClick={onClose}>
              Cerrar
            </ActionButton>
          </DialogActions>
        </div>
      )}
    </InventoryDialog>
  )
}

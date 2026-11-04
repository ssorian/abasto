import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  SectionHelp,
  WarningInline,
} from '#/modules/inventory/components/info-blocks'
import { LabelDialog } from '#/modules/inventory/forms/label-dialog'
import { LotActionDialog } from '#/modules/inventory/forms/lot-action-dialog'
import { dateLabel, money, timeLabel } from '#/modules/inventory/lib/format'
import { createLotLabel } from '#/modules/inventory/lib/lot-labels'
import {
  blockLot,
  changeStock,
  updateLotPrice,
} from '#/modules/inventory/lib/operations'
import {
  daysLeft,
  isExpired,
  lotStatus,
  stockFor,
} from '#/modules/inventory/lib/stock'

import type { WarehouseName } from '#/shared/demo/types'
import type { ApplyOperation } from '#/modules/inventory/hooks/use-inventory-state'
import type {
  LotActionMode,
  LotActionResult,
} from '#/modules/inventory/forms/lot-action-dialog'
import type {
  InventoryProduct,
  InventoryState,
} from '#/modules/inventory/types/inventory'

type LotsPanelProps = {
  state: InventoryState
  product: InventoryProduct
  warehouse: WarehouseName
  apply: ApplyOperation
}

const lotButton = 'px-2 py-[11px] text-xs'

/** Lots of one product in one warehouse with block, price, write-off and label actions. */
export function LotsPanel({
  state,
  product,
  warehouse,
  apply,
}: LotsPanelProps) {
  const [action, setAction] = useState<{
    id: string
    mode: LotActionMode
  } | null>(null)
  const [labelId, setLabelId] = useState<string | null>(null)
  const stock = stockFor(state, product.id, warehouse)
  const lotOf = (id: string | undefined) =>
    stock.lots.find((item) => item.id === id)
  const actionLot = lotOf(action?.id)
  const labelLot = lotOf(labelId ?? undefined)
  const history = state.priceHistory.filter(
    (item) => item.productId === product.id && item.warehouse === warehouse,
  )

  const confirm = (result: LotActionResult) => {
    if (!actionLot) return false
    if (result.mode === 'price') {
      return apply(
        (s) =>
          updateLotPrice(
            s,
            product.id,
            warehouse,
            actionLot.id,
            result.price,
            result.reason,
          ),
        'Precio del lote actualizado. Pedidos anteriores sin cambios.',
      )
    }
    if (result.mode === 'out') {
      return apply(
        (s) =>
          changeStock(s, {
            productId: product.id,
            warehouse,
            mode: 'out',
            value: result.qty,
            reason: isExpired(actionLot) ? 'Caducidad' : 'Producto dañado',
            note: result.reason,
            lotId: actionLot.id,
          }),
        'Baja del lote registrada.',
      )
    }
    const blocking = result.mode === 'block'
    return apply(
      (s) =>
        blockLot(
          s,
          product.id,
          warehouse,
          actionLot.id,
          blocking,
          result.reason,
        ),
      blocking ? 'Lote bloqueado.' : 'Lote liberado.',
    )
  }

  return (
    <>
      <SectionHelp>
        La salida automática prioriza la caducidad más próxima. Los vencidos y
        bloqueados no están disponibles para pedidos.
      </SectionHelp>
      {stock.lots.map((lot) => {
        const status = lotStatus(lot)
        const rows: Array<[string, string]> = [
          [
            'Existencias / reservadas',
            `${lot.qty} / ${lot.reserved} ${product.unit}`,
          ],
          ['Costo de entrada', money(lot.cost)],
          [
            `Precio de venta por ${product.packName}`,
            money(lot.salePrice ?? product.price),
          ],
        ]
        return (
          <div
            key={lot.id}
            className="mb-[13px] rounded-[10px] border border-[#e1e8ef] p-[19px]"
          >
            <div className="mb-4 flex items-center justify-between gap-3 text-sm">
              <strong>{lot.code || 'Sin lote identificado'}</strong>
              <span className="rounded-[5px] bg-[#edf4f9] px-[7px] py-1 text-[13px] text-[#567797]">
                {status}
              </span>
            </div>
            {rows.map(([label, value]) => (
              <LotRow key={label} label={label} value={value} />
            ))}
            <small className="mt-3.5 block text-xs text-[#9aa7b7]">
              {lot.salePrice === undefined
                ? 'Hereda el precio general'
                : 'Precio específico del lote'}{' '}
              · Recepción {lot.receiptId}
            </small>
            <LotRow
              label="Caducidad"
              value={`${lot.expiry || 'Sin fecha'}${lot.expiry && !isExpired(lot) ? ` · ${daysLeft(lot.expiry)} días` : ''}`}
            />
            {lot.blockReason && (
              <WarningInline>{lot.blockReason}</WarningInline>
            )}
            <small className="mt-3.5 block text-xs text-[#9aa7b7]">
              Recibido: {new Date(lot.receivedAt).toLocaleDateString('es-MX')}
            </small>
            <div className="mt-[18px] grid grid-cols-2 gap-2">
              <ActionButton
                className={lotButton}
                disabled={status === 'Vencido' || status === 'Bloqueado'}
                onClick={() => setLabelId(lot.id)}
              >
                Etiqueta por lote
              </ActionButton>
              <ActionButton
                className={lotButton}
                onClick={() => setAction({ id: lot.id, mode: 'price' })}
              >
                Cambiar precio
              </ActionButton>
              <ActionButton
                className={lotButton}
                disabled={isExpired(lot)}
                onClick={() =>
                  setAction({
                    id: lot.id,
                    mode: lot.blocked ? 'release' : 'block',
                  })
                }
              >
                {lot.blocked ? 'Liberar lote' : 'Bloquear lote'}
              </ActionButton>
              <ActionButton
                className={lotButton}
                onClick={() => setAction({ id: lot.id, mode: 'out' })}
              >
                Registrar baja
              </ActionButton>
            </div>
          </div>
        )
      })}
      {!stock.lots.length && (
        <SectionHelp>
          Los lotes aparecerán al registrar una entrada.
        </SectionHelp>
      )}
      {action && actionLot && (
        <LotActionDialog
          mode={action.mode}
          product={product}
          lot={actionLot}
          warehouse={warehouse}
          onClose={() => setAction(null)}
          onConfirm={confirm}
        />
      )}
      {labelId && labelLot && (
        <LabelDialog
          state={state}
          product={product}
          lot={labelLot}
          warehouse={warehouse}
          onClose={() => setLabelId(null)}
          onCreate={(presentationId) =>
            apply(
              (s) =>
                createLotLabel(
                  s,
                  product.id,
                  warehouse,
                  labelLot.id,
                  presentationId,
                ),
              'Etiqueta creada. Ya puedes imprimirla.',
            )
          }
        />
      )}
      <div className="mt-6 border-t border-[#e9eef5] pt-4">
        <h3 className="text-[15px] font-semibold">Historial de precios</h3>
        {history.length ? (
          history.map((item) => (
            <div
              key={item.id}
              className="border-b border-[#e9eef5] py-3 text-xs"
            >
              <strong className="block text-[13px]">
                {item.lot || 'Lote sin identificar'}
              </strong>
              <span className="mt-1 block text-[#58718d]">
                {item.previous === null
                  ? `General (${money(item.previousEffective)})`
                  : money(item.previous)}{' '}
                → {item.next === null ? 'Precio general' : money(item.next)} ·
                Efectivo: {money(item.effective)}
              </span>
              <small className="mt-1 block text-[#9aa7b7]">
                {dateLabel(item.date)} · {timeLabel(item.date)} · {item.actor}
              </small>
              <p className="mt-1 text-[#8d9aad]">{item.reason}</p>
            </div>
          ))
        ) : (
          <SectionHelp>
            Los cambios de precio aparecerán aquí, con fecha, responsable y
            motivo.
          </SectionHelp>
        )}
      </div>
    </>
  )
}

function LotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-[5px] text-xs text-[#8d9aad]">
      <span>{label}</span>
      <b className="font-medium text-[#58718d]">{value}</b>
    </div>
  )
}

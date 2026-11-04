import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from '#/modules/inventory/components/form-controls'
import {
  InfoBanner,
  SectionHelp,
} from '#/modules/inventory/components/info-blocks'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import { money, unitSingular } from '#/modules/inventory/lib/format'
import { isExpired } from '#/modules/inventory/lib/stock'

import type { WarehouseName } from '#/shared/demo/types'
import type { InventoryProduct, Lot } from '#/modules/inventory/types/inventory'

export type LotActionMode = 'price' | 'block' | 'release' | 'out'

/** What the user confirmed; the page maps it to a pure operation. */
export type LotActionResult =
  | { mode: 'price'; price: number | undefined; reason: string }
  | { mode: 'block' | 'release'; reason: string }
  | { mode: 'out'; qty: number; reason: string }

type LotActionDialogProps = {
  mode: LotActionMode
  product: InventoryProduct
  lot: Lot
  warehouse: WarehouseName
  onClose: () => void
  /** Returns true when the operation was registered. */
  onConfirm: (result: LotActionResult) => boolean
}

const titles: Record<LotActionMode, string> = {
  price: 'Precio de venta del lote',
  out: 'Baja de un lote',
  release: 'Liberar lote',
  block: 'Bloquear lote',
}

const confirmLabels: Record<LotActionMode, string> = {
  price: 'precio',
  out: 'baja',
  release: 'liberación',
  block: 'bloqueo',
}

/** Block, release, price or write-off of one lot; every action needs a reason. */
export function LotActionDialog({
  mode,
  product,
  lot,
  warehouse,
  onClose,
  onConfirm,
}: LotActionDialogProps) {
  const [note, setNote] = useState(
    mode === 'out' && isExpired(lot) ? 'Caducidad' : '',
  )
  const [qty, setQty] = useState('')
  const [priceMode, setPriceMode] = useState(
    lot.salePrice === undefined ? 'general' : 'custom',
  )
  const [price, setPrice] = useState(String(lot.salePrice ?? product.price))

  const submit = () => {
    const result: LotActionResult =
      mode === 'price'
        ? {
            mode,
            price: priceMode === 'general' ? undefined : Number(price),
            reason: note,
          }
        : mode === 'out'
          ? { mode, qty: Number(qty), reason: note }
          : { mode, reason: note }
    if (onConfirm(result)) onClose()
  }

  return (
    <InventoryDialog
      title={titles[mode]}
      description={`${product.name} · ${lot.code} · Almacén ${warehouse}`}
      onClose={onClose}
    >
      <InfoBanner>
        {lot.qty} {product.unit} en este lote. Costo: {money(lot.cost)} por{' '}
        {unitSingular(product.unit)}.
      </InfoBanner>
      {mode === 'out' && (
        <Field label={`Cantidad de ${product.unit} a retirar`}>
          <FieldInput
            aria-label="Cantidad del lote"
            type="number"
            min="1"
            max={lot.qty}
            value={qty}
            onChange={(event) => setQty(event.target.value)}
          />
        </Field>
      )}
      {mode === 'price' && (
        <>
          <Field label="Origen del precio">
            <FieldSelect
              aria-label="Origen del precio"
              value={priceMode}
              onChange={(event) => setPriceMode(event.target.value)}
            >
              <option value="general">
                Heredar precio general · {money(product.price)}
              </option>
              <option value="custom">Asignar un precio a este lote</option>
            </FieldSelect>
          </Field>
          {priceMode === 'custom' && (
            <Field label={`Precio por ${product.packName}`}>
              <FieldInput
                aria-label="Precio del lote"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </Field>
          )}
          <SectionHelp>
            Se aplicará a nuevas reservas. Los pedidos ya confirmados
            conservarán sus precios.
          </SectionHelp>
        </>
      )}
      <Field label="Motivo obligatorio">
        <FieldTextarea
          aria-label="Motivo del lote"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <ActionButton tone="primary" disabled={!note.trim()} onClick={submit}>
        Confirmar {confirmLabels[mode]}
      </ActionButton>
    </InventoryDialog>
  )
}

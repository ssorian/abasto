import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import { ProductPicker } from '#/components/product-picker'
import {
  ActionButton,
  IconButton,
} from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldGroup,
  FieldSelect,
  FieldTextarea,
} from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { QuantityFields } from '#/modules/inventory/forms/quantity-fields'
import { quantityPresentations } from '#/modules/inventory/lib/pack-info'
import { useTransferActions } from '#/modules/transfers/hooks/use-transfer-actions'
import { transferInputFromDraft } from '#/modules/transfers/lib/transfer-drafts'
import { unitCount } from '#/modules/transfers/lib/transfer-labels'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type DraftLine = {
  key: number
  productId: string
  presentationId: string
  packs: string
  loose: string
}

type TransferDialogProps = {
  from: { id: string; name: string }
  destinations: ReadonlyArray<{ id: string; name: string }>
  products: ReadonlyArray<CatalogProduct>
  /** Stock of the source warehouse; only products with available units can be sent. */
  stock: ReadonlyArray<ProductStock>
  onClose: () => void
}

let counter = 0
const newLine = (): DraftLine => ({
  key: (counter += 1),
  productId: '',
  presentationId: '',
  packs: '',
  loose: '',
})

/** New transfer: destination, products with quantities, optional note. */
export function TransferDialog({
  from,
  destinations,
  products,
  stock,
  onClose,
}: TransferDialogProps) {
  const actions = useTransferActions()
  const [toWarehouseId, setTo] = useState(destinations.at(0)?.id ?? '')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Array<DraftLine>>(() => [newLine()])
  const [error, setError] = useState<string | null>(null)

  const sendable = stock.filter((row) => row.available > 0)
  const sendableProducts = sendable.map((row) => ({
    id: row.productId,
    name: row.name,
    sku: row.sku,
  }))
  const patch = (key: number, next: Partial<DraftLine>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...next } : line)),
    )

  async function submit() {
    const parsed = transferInputFromDraft({
      fromWarehouseId: from.id,
      toWarehouseId,
      notes,
      lines: lines.map((line) => {
        const product = products.find(({ id }) => id === line.productId)
        const presentation = product
          ? quantityPresentations(product).find(
              ({ id }) => id === line.presentationId,
            )
          : undefined
        const row = sendable.find((item) => item.productId === line.productId)
        return {
          productId: line.productId,
          packs: line.packs,
          loose: line.loose,
          factor: presentation?.factor ?? 1,
          stock: row && {
            name: row.name,
            available: row.available,
            unit: row.unit,
          },
        }
      }),
    })
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    const result = await actions.dispatch(parsed.value)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Nuevo traslado"
      eyebrow={`SALE DE ${from.name.toUpperCase()}`}
      description="Se toman unidades disponibles y vigentes, las de caducidad más próxima primero. El otro almacén las recibe cuando lleguen."
      size="wide"
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label="Almacén de destino">
          <FieldSelect
            value={toWarehouseId}
            onChange={(event) => setTo(event.target.value)}
          >
            <option value="">Selecciona un almacén</option>
            {destinations.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </FieldSelect>
        </Field>
        {lines.map((line, index) => {
          const product = products.find(({ id }) => id === line.productId)
          const row = sendable.find((item) => item.productId === line.productId)
          return (
            <fieldset
              key={line.key}
              className="grid gap-3 rounded-[10px] border border-[#efe9e3] p-4"
            >
              <legend className="px-1 text-xs font-[650] text-[#866d75]">
                Producto {index + 1}
              </legend>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <FieldGroup label="Producto">
                  <ProductPicker
                    label={`Producto ${index + 1}`}
                    products={sendableProducts}
                    value={line.productId}
                    onChange={(id) => {
                      const next = products.find((item) => item.id === id)
                      patch(line.key, {
                        productId: id,
                        presentationId: next
                          ? (quantityPresentations(next).at(0)?.id ?? '')
                          : '',
                      })
                    }}
                  />
                  {row && (
                    <small className="text-[11px] font-normal text-[#9c888f]">
                      Disponible: {unitCount(row.available, row.unit)}
                    </small>
                  )}
                </FieldGroup>
                {lines.length > 1 && (
                  <IconButton
                    aria-label={`Quitar producto ${index + 1}`}
                    className="self-end"
                    onClick={() =>
                      setLines(lines.filter(({ key }) => key !== line.key))
                    }
                  >
                    <Trash2Icon size={17} />
                  </IconButton>
                )}
              </div>
              {product && (
                <QuantityFields
                  presentations={quantityPresentations(product)}
                  unit={product.unit}
                  presentationId={line.presentationId}
                  packs={line.packs}
                  loose={line.loose}
                  onChange={(next) => patch(line.key, next)}
                />
              )}
            </fieldset>
          )
        })}
        <div>
          <ActionButton
            type="button"
            onClick={() => setLines([...lines, newLine()])}
          >
            <PlusIcon size={17} />
            Agregar producto
          </ActionButton>
        </div>
        <Field label="Nota (opcional)">
          <FieldTextarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={actions.pending}>
            Enviar traslado
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

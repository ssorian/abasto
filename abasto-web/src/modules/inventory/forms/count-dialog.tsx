import { useState } from 'react'
import { toast } from 'sonner'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldSelect,
  FieldTextarea,
} from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { QuantityFields } from '#/modules/inventory/forms/quantity-fields'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import {
  packInfoOf,
  quantityPresentations,
} from '#/modules/inventory/lib/pack-info'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import {
  countDifference,
  countInputFromDraft,
  typedCount,
} from '#/modules/inventory/lib/stock-drafts'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type CountDialogProps = {
  warehouseId: string
  products: ReadonlyArray<CatalogProduct>
  stock: ReadonlyArray<ProductStock>
  onClose: () => void
}

/** Physical count of one product; the system applies the difference (FEFO / newest lot). */
export function CountDialog({
  warehouseId,
  products,
  stock,
  onClose,
}: CountDialogProps) {
  const actions = useInventoryActions()
  const [productId, setProductId] = useState('')
  const product = products.find(({ id }) => id === productId)
  const presentations = product ? quantityPresentations(product) : []
  const [presentationId, setPresentationId] = useState('')
  const [packs, setPacks] = useState('')
  const [loose, setLoose] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedId = presentations.some(({ id }) => id === presentationId)
    ? presentationId
    : (presentations.at(0)?.id ?? '')
  const factor = presentations.find(({ id }) => id === selectedId)?.factor ?? 1
  const expected = stock.find((row) => row.productId === productId)?.onHand ?? 0
  // Blank is not zero: no difference is shown until a number is typed.
  const counted = typedCount({ packs, loose, factor })
  const pack = product ? packInfoOf(product) : null

  async function submit() {
    const parsed = countInputFromDraft({
      productId,
      warehouseId,
      packs,
      loose,
      factor,
      note,
    })
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    const result = await actions.countStock(parsed.value)
    if (!result || !pack) return
    const { difference } = result.data
    toast.success(
      difference === 0
        ? 'Conteo registrado. Las existencias coinciden.'
        : `Conteo registrado. Diferencia: ${difference > 0 ? '+' : ''}${formatQuantity(difference, pack)}.`,
    )
    onClose()
  }

  return (
    <InventoryDialog
      title="Conteo físico"
      description="Cuenta lo que hay en el estante. Si no coincide con el sistema, la diferencia se aplica a los lotes y queda en Movimientos."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label="Producto">
          <FieldSelect
            value={productId}
            onChange={(event) => {
              setProductId(event.target.value)
              setPresentationId('')
            }}
          >
            <option value="">Selecciona un producto</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FieldSelect>
        </Field>
        {product && pack && (
          <>
            <QuantityFields
              label="Cantidad contada"
              presentations={presentations}
              unit={product.unit}
              presentationId={selectedId}
              packs={packs}
              loose={loose}
              onChange={(patch) => {
                if (patch.presentationId !== undefined) {
                  setPresentationId(patch.presentationId)
                }
                if (patch.packs !== undefined) setPacks(patch.packs)
                if (patch.loose !== undefined) setLoose(patch.loose)
              }}
            />
            {counted !== null && (
              <p className="text-xs leading-[1.7] text-[#856972]">
                El sistema tiene {formatQuantity(expected, pack)}. Diferencia:{' '}
                {countDifference(expected, counted) > 0 ? '+' : ''}
                {formatQuantity(countDifference(expected, counted), pack)}.
              </p>
            )}
            <Field label="Nota (opcional)">
              <FieldTextarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </>
        )}
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={actions.pending}>
            {actions.pending ? 'Guardando…' : 'Registrar conteo'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

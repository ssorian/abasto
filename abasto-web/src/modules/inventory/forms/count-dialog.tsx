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
  countInputFromDraft,
  typedCount,
} from '#/modules/inventory/lib/stock-drafts'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type CountDialogProps = {
  warehouseId: string
  products: ReadonlyArray<CatalogProduct>
  onClose: () => void
}

/**
 * Blind physical count of one product: the system quantity stays hidden until
 * the count is recorded, then the difference is applied (FEFO / newest lot).
 */
export function CountDialog({
  warehouseId,
  products,
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
  const [zeroConfirmed, setZeroConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedId = presentations.some(({ id }) => id === presentationId)
    ? presentationId
    : (presentations.at(0)?.id ?? '')
  const factor = presentations.find(({ id }) => id === selectedId)?.factor ?? 1
  // Blank is not zero: only a typed 0 asks for confirmation.
  const counted = typedCount({ packs, loose, factor })
  const mustConfirmZero = counted === 0
  const pack = product ? packInfoOf(product) : null

  async function submit() {
    const parsed = countInputFromDraft({
      productId,
      warehouseId,
      packs,
      loose,
      factor,
      note,
      zeroConfirmed,
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
      description="Cuenta lo que hay en el estante sin mirar el sistema. Al registrar el conteo verás la diferencia; se aplica a los lotes y queda en Movimientos."
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
              setZeroConfirmed(false)
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
                // A confirmation is for this exact zero, not a later one.
                setZeroConfirmed(false)
              }}
            />
            {mustConfirmZero && (
              <label
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#e3b9bd] bg-[#fbecee] p-3 text-sm text-[#8f2d36]"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={zeroConfirmed}
                  onChange={(event) => setZeroConfirmed(event.target.checked)}
                />
                <span>
                  <strong>Conteo en 0.</strong> Las existencias de este producto
                  quedarán en 0. Marca la casilla para confirmar que no queda
                  nada.
                </span>
              </label>
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
          <ActionButton
            tone="primary"
            type="submit"
            disabled={actions.pending || (mustConfirmZero && !zeroConfirmed)}
          >
            {actions.pending ? 'Guardando…' : 'Registrar conteo'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

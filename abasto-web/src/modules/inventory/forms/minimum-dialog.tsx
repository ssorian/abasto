import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
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
import { minimumInputFromDraft } from '#/modules/inventory/lib/stock-drafts'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type MinimumDialogProps = {
  warehouseId: string
  products: ReadonlyArray<CatalogProduct>
  stock: ReadonlyArray<ProductStock>
  /** Product whose minimum is set; chosen from its row in Productos. */
  productId: string
  onClose: () => void
}

/** Sets the minimum stock of a product in this warehouse (zero removes it). */
export function MinimumDialog({
  warehouseId,
  products,
  stock,
  productId,
  onClose,
}: MinimumDialogProps) {
  const actions = useInventoryActions()
  const product = products.find(({ id }) => id === productId)
  const presentations = product ? quantityPresentations(product) : []
  const [presentationId, setPresentationId] = useState('')
  const [packs, setPacks] = useState('')
  const [loose, setLoose] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedId = presentations.some(({ id }) => id === presentationId)
    ? presentationId
    : (presentations.at(0)?.id ?? '')
  const factor = presentations.find(({ id }) => id === selectedId)?.factor ?? 1
  const current = stock.find((row) => row.productId === productId)?.minimum ?? 0

  async function submit() {
    const parsed = minimumInputFromDraft({
      productId,
      warehouseId,
      packs,
      loose,
      factor,
    })
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    const saved = await actions.setMinimum(parsed.value)
    if (saved) onClose()
  }

  return (
    <InventoryDialog
      title="Mínimo de existencias"
      eyebrow={product?.name.toUpperCase()}
      description="Te avisamos como «Stock bajo» cuando las existencias disponibles queden por debajo. Escribe 0 para quitarlo."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {product && (
          <>
            <p className="text-xs text-[#9c898f]">
              Mínimo actual:{' '}
              {current > 0
                ? formatQuantity(current, packInfoOf(product))
                : 'sin mínimo'}
              .
            </p>
            <QuantityFields
              label="Nuevo mínimo"
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
          </>
        )}
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={actions.pending}>
            {actions.pending ? 'Guardando…' : 'Guardar mínimo'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

import { useState } from 'react'

import { useCatalogActions } from '#/modules/catalog/hooks/use-catalog'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { Field, FieldInput } from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import {
  pieceCostDraftOf,
  pieceCostErrors,
  pieceCostPatchOf,
} from '#/modules/inventory/lib/piece-cost-draft'
import type { PieceCostDraft } from '#/modules/inventory/lib/piece-cost-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type PieceCostDialogProps = {
  product: CatalogProduct
  onClose: () => void
}

const fields: ReadonlyArray<[keyof PieceCostDraft, string]> = [
  ['listPrice', 'Precio por pieza'],
  ['fixedDiscount', 'Descuento fijo por pieza'],
  ['promotion', 'Promoción por pieza'],
]

/** Edits the supplier cost of one product (price, fixed discount, promotion per piece) and saves it to the catalog. */
export function PieceCostDialog({ product, onClose }: PieceCostDialogProps) {
  const catalogActions = useCatalogActions()
  const [draft, setDraft] = useState(() => pieceCostDraftOf(product))
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const errors = pieceCostErrors(draft)

  async function submit() {
    const patch = pieceCostPatchOf(draft)
    if (!patch.ok) return setShowErrors(true)
    setError(null)
    setPending(true)
    const failure = await catalogActions.savePieceCost(product.id, patch.value)
    setPending(false)
    if (failure === null) onClose()
    else setError(failure)
  }

  return (
    <InventoryDialog
      title="Costo por pieza"
      eyebrow={product.name}
      description="Se guarda en el catálogo y se usa en los pedidos nuevos; los pedidos ya registrados conservan su costo. Hasta 4 decimales."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <FieldInput
              inputMode="decimal"
              placeholder="0.0000"
              aria-label={label}
              aria-invalid={showErrors && Boolean(errors[key])}
              value={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
            />
            {showErrors && errors[key] && (
              <span className="text-xs text-[#b42318]">{errors[key]}</span>
            )}
          </Field>
        ))}
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar costo'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

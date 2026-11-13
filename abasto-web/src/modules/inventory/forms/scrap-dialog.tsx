import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { Field, FieldInput } from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import { boxCountLabel } from '#/modules/inventory/lib/order-rows'
import { scrapInputFromDraft } from '#/modules/inventory/lib/pending-return'
import type { PendingBalance } from '#/modules/inventory/services/supplier-pendings'

type ScrapDialogProps = {
  pending: PendingBalance
  onClose: () => void
}

/** The supplier will not take damaged boxes back: they are written off as merma. */
export function ScrapDialog({ pending, onClose }: ScrapDialogProps) {
  const actions = useInventoryActions()
  const [boxes, setBoxes] = useState(String(pending.owedBoxes))
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const parsed = scrapInputFromDraft({
      pendingId: pending.pendingId,
      owedBoxes: pending.owedBoxes,
      boxes,
    })
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    const result = await actions.scrapPending(parsed.value)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Dar por merma"
      eyebrow={pending.supplierName.toUpperCase()}
      description={`${pending.productName} (${pending.originCode}): ${boxCountLabel(pending.owedBoxes, pending.boxFactor)} por devolver, valoradas en ${formatCents(pending.owedValueCents)}. El proveedor no las repone ni las descuenta: su valor cuenta como pérdida. El inventario no cambia.`}
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void confirm()
        }}
      >
        <Field label="Cajas a dar por merma">
          <FieldInput
            inputMode="numeric"
            value={boxes}
            onChange={(event) => setBoxes(event.target.value)}
          />
        </Field>
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={actions.pending}>
            {actions.pending ? 'Guardando…' : 'Confirmar merma'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

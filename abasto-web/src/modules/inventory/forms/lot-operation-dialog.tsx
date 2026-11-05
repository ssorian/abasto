import { useState } from 'react'

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
import { lossCategoryOptions } from '#/modules/inventory/lib/loss-categories'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import {
  adjustInputFromDraft,
  lossInputFromDraft,
} from '#/modules/inventory/lib/stock-drafts'
import type { LossCategory } from '#/modules/inventory/db/schema'
import type { StockLot } from '#/modules/inventory/services/stock-reads'

export type LotOperation = {
  kind: 'adjust' | 'loss'
  lot: StockLot
  productName: string
  pack: PackInfo
  presentations: ReadonlyArray<{ id: string; name: string; factor: number }>
  /** Presentation the quantity starts in. */
  presentationId: string
}

/** Adjustment (add/remove) or loss on one lot; the reason is required. */
export function LotOperationDialog({
  operation,
  onClose,
}: {
  operation: LotOperation
  onClose: () => void
}) {
  const actions = useInventoryActions()
  const isLoss = operation.kind === 'loss'
  const [direction, setDirection] = useState<'add' | 'remove'>('remove')
  const [category, setCategory] = useState<LossCategory>('caducado')
  const [quantity, setQuantity] = useState({
    presentationId: operation.presentationId,
    packs: '',
    loose: '',
  })
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const factor =
    operation.presentations.find(({ id }) => id === quantity.presentationId)
      ?.factor ?? 1

  const draft = { lotId: operation.lot.id, ...quantity, factor, reason }

  /** Resolves to `closed` on success, or the message to show. */
  async function submitLoss(loss: typeof draft) {
    const parsed = lossInputFromDraft({ ...loss, category })
    if (!parsed.ok) return parsed.message
    return (await actions.registerLoss(parsed.value)) ? 'closed' : null
  }

  async function submitAdjustment(
    adjustment: typeof draft & { direction: 'add' | 'remove' },
  ) {
    const parsed = adjustInputFromDraft(adjustment)
    if (!parsed.ok) return parsed.message
    return (await actions.adjustLot(parsed.value)) ? 'closed' : null
  }

  async function submit() {
    setError(null)
    setPending(true)
    const done = isLoss
      ? await submitLoss(draft)
      : await submitAdjustment({ ...draft, direction })
    setPending(false)
    if (done === 'closed') onClose()
    else if (done) setError(done)
  }

  return (
    <InventoryDialog
      title={isLoss ? 'Registrar pérdida' : 'Ajustar lote'}
      eyebrow={operation.productName.toUpperCase()}
      description={`Lote ${operation.lot.code || 'sin código'} · hay ${formatQuantity(operation.lot.onHand, operation.pack)}.`}
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {isLoss ? (
          <Field label="Tipo de pérdida">
            <FieldSelect
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as LossCategory)
              }
            >
              {lossCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FieldSelect>
          </Field>
        ) : (
          <Field label="Movimiento">
            <FieldSelect
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as 'add' | 'remove')
              }
            >
              <option value="remove">Quitar existencias</option>
              <option value="add">Sumar existencias</option>
            </FieldSelect>
          </Field>
        )}
        <QuantityFields
          presentations={operation.presentations}
          unit={operation.pack.unit}
          {...quantity}
          onChange={(patch) => setQuantity({ ...quantity, ...patch })}
        />
        <Field label="Motivo">
          <FieldTextarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              isLoss ? 'Qué pasó con estas piezas' : 'Por qué corriges el lote'
            }
          />
        </Field>
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={pending}>
            {pending
              ? 'Guardando…'
              : isLoss
                ? 'Registrar pérdida'
                : 'Guardar ajuste'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

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
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import { removalPrefill } from '#/modules/inventory/lib/removal-prefill'
import { expiryState } from '#/modules/inventory/lib/stock-metrics'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import {
  additionInputFromDraft,
  removalInputFromDraft,
} from '#/modules/inventory/lib/stock-drafts'
import type { RemovalReason } from '#/modules/inventory/lib/stock-drafts'
import type { StockLot } from '#/modules/inventory/services/stock-reads'

export type LotOperation = {
  /** Take stock out (with a reason) or add it back. */
  mode: 'remove' | 'add'
  lot: StockLot
  productName: string
  pack: PackInfo
  presentations: ReadonlyArray<{ id: string; name: string; factor: number }>
  /** Today (warehouse date) to tell whether the lot is already expired. */
  today: string
  /** Presentation the quantity starts in. */
  presentationId: string
}

const reasonOptions: ReadonlyArray<{ value: RemovalReason; label: string }> = [
  { value: 'caducado', label: 'Pérdida: vencido' },
  { value: 'dañado', label: 'Pérdida: dañado' },
  { value: 'otro', label: 'Otro motivo' },
]

/** Takes stock out of a lot (a loss or an adjustment, by reason) or adds it back (an adjustment). */
export function LotOperationDialog({
  operation,
  onClose,
}: {
  operation: LotOperation
  onClose: () => void
}) {
  const actions = useInventoryActions()
  const expired =
    expiryState(operation.lot.expiresOn, operation.today) === 'expired'
  const factorOf = (presentationId: string) =>
    operation.presentations.find(({ id }) => id === presentationId)?.factor ?? 1
  const prefillFor = (nextReason: RemovalReason, presentationId: string) =>
    operation.mode === 'remove'
      ? (removalPrefill({
          reason: nextReason,
          expired,
          onHand: operation.lot.onHand,
          factor: factorOf(presentationId),
        }) ?? { packs: '', loose: '' })
      : { packs: '', loose: '' }
  const [reason, setReason] = useState<RemovalReason>('caducado')
  const [quantity, setQuantity] = useState({
    presentationId: operation.presentationId,
    ...prefillFor('caducado', operation.presentationId),
  })
  // Once the user edits the quantity, changing the reason no longer rewrites it.
  const [edited, setEdited] = useState(false)
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const factor =
    operation.presentations.find(({ id }) => id === quantity.presentationId)
      ?.factor ?? 1

  const adding = operation.mode === 'add'

  async function submit() {
    if (adding) {
      const parsed = additionInputFromDraft({
        lotId: operation.lot.id,
        ...quantity,
        factor,
        detail,
      })
      if (!parsed.ok) return setError(parsed.message)
      setError(null)
      if (await actions.adjustLot(parsed.value)) onClose()
      return
    }
    const parsed = removalInputFromDraft({
      lotId: operation.lot.id,
      ...quantity,
      factor,
      reason,
      detail,
    })
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    const saved =
      parsed.value.kind === 'loss'
        ? await actions.registerLoss(parsed.value.input)
        : await actions.adjustLot(parsed.value.input)
    if (saved) onClose()
  }

  return (
    <InventoryDialog
      title={adding ? 'Sumar existencias' : 'Quitar existencias'}
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
        {!adding && (
          <Field label="¿Por qué las quitas?">
            <FieldSelect
              value={reason}
              onChange={(event) => {
                const next = event.target.value as RemovalReason
                setReason(next)
                if (!edited) {
                  setQuantity({
                    ...quantity,
                    ...prefillFor(next, quantity.presentationId),
                  })
                }
              }}
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FieldSelect>
          </Field>
        )}
        <QuantityFields
          presentations={operation.presentations}
          unit={operation.pack.unit}
          {...quantity}
          onChange={(patch) => {
            setEdited(true)
            setQuantity({ ...quantity, ...patch })
          }}
        />
        <Field label={adding ? '¿Por qué las sumas?' : '¿Qué pasó?'}>
          <FieldTextarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder={
              adding
                ? 'Por ejemplo: llegó una caja de más'
                : reason === 'otro'
                  ? 'Por qué corriges el lote'
                  : 'Qué pasó con estas piezas'
            }
          />
        </Field>
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={actions.pending}>
            {actions.pending
              ? 'Guardando…'
              : adding
                ? 'Sumar existencias'
                : 'Quitar existencias'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

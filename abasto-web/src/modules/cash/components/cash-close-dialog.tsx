import { useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import { useCashActions } from '#/modules/cash/hooks/use-cash-actions'
import { closePreview, differenceLabel } from '#/modules/cash/lib/cash-summary'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CashSession } from '#/modules/cash/services/cash-ledger'

type CashCloseDialogProps = {
  warehouseId: string
  expectedCents: number
  onClose: () => void
}

export function CashCloseDialog({
  warehouseId,
  expectedCents,
  onClose,
}: CashCloseDialogProps) {
  const actions = useCashActions(warehouseId)
  const [text, setText] = useState('')
  const [closed, setClosed] = useState<CashSession>()
  const preview = text.trim() ? closePreview(expectedCents, text) : null

  async function submit() {
    if (!preview?.ok) return
    await actions.close(preview.value.countedCents, setClosed)
  }

  if (closed) {
    return (
      <CounterDialog
        title="Caja cerrada"
        description="Este es el resultado del corte."
        onClose={onClose}
      >
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt>Esperado</dt>
          <dd className="text-right">
            {formatCents(closed.expectedCents ?? 0)}
          </dd>
          <dt>Contado</dt>
          <dd className="text-right">
            {formatCents(closed.countedCents ?? 0)}
          </dd>
          <dt className="font-[650]">Diferencia</dt>
          <dd className="text-right font-[650]">
            {differenceLabel(closed.differenceCents ?? 0)}
          </dd>
        </dl>
        <div className="flex justify-end">
          <ActionButton tone="primary" onClick={onClose}>
            Listo
          </ActionButton>
        </div>
      </CounterDialog>
    )
  }

  return (
    <CounterDialog
      title="Cerrar caja"
      description={`El sistema espera ${formatCents(expectedCents)} en la caja. Cuenta el efectivo y escribe cuánto hay.`}
      onClose={onClose}
    >
      <Field label="Efectivo contado (pesos)">
        <FieldInput
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      {preview && (
        <p
          className={
            preview.ok ? 'text-sm font-[650]' : 'text-sm text-[#a1372e]'
          }
        >
          {preview.ok
            ? differenceLabel(preview.value.differenceCents)
            : preview.message}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <ActionButton onClick={onClose}>Cancelar</ActionButton>
        <ActionButton
          tone="primary"
          disabled={actions.pending || !preview?.ok}
          onClick={submit}
        >
          Cerrar caja
        </ActionButton>
      </div>
    </CounterDialog>
  )
}

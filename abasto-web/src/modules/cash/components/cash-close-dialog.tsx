import { useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  Field,
  FieldInput,
  FieldTextarea,
} from '#/modules/counter/components/form-controls'
import { useCashActions } from '#/modules/cash/hooks/use-cash-actions'
import { countedCash, differenceLabel } from '#/modules/cash/lib/cash-summary'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CashSession } from '#/modules/cash/services/cash-ledger'

type CashCloseDialogProps = {
  warehouseId: string
  onClose: () => void
}

/** Blind close: the expected cash is revealed only after the count is recorded. */
export function CashCloseDialog({
  warehouseId,
  onClose,
}: CashCloseDialogProps) {
  const actions = useCashActions(warehouseId)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [closed, setClosed] = useState<CashSession>()
  const counted = text.trim() ? countedCash(text) : null

  async function submit() {
    if (!counted?.ok) return
    await actions.close(counted.value, note, setClosed)
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
          {closed.note && (
            <>
              <dt>Nota</dt>
              <dd className="text-right break-words">{closed.note}</dd>
            </>
          )}
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
      description="Cuenta el efectivo y escribe cuánto hay. Al cerrar verás lo que esperaba el sistema y la diferencia."
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
      {counted && !counted.ok && (
        <p className="text-sm text-[#a1372e]">{counted.message}</p>
      )}
      <Field label="Nota (opcional)">
        <FieldTextarea
          maxLength={500}
          placeholder="Explica una diferencia, por ejemplo: faltó cambio."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <ActionButton onClick={onClose}>Cancelar</ActionButton>
        <ActionButton
          tone="primary"
          disabled={actions.pending || !counted?.ok}
          onClick={submit}
        >
          Cerrar caja
        </ActionButton>
      </div>
    </CounterDialog>
  )
}

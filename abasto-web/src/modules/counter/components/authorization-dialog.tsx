import { useState } from 'react'

import { operatorName } from '#/modules/counter/lib/constants'
import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  FieldTextarea,
  Field,
} from '#/modules/counter/components/form-controls'
import { DetailsBox } from '#/modules/counter/components/metric-grid'

import type { OperationReview } from '#/modules/counter/lib/review'

/** Asks for the reason of a sensitive operation before registering it. */
export function AuthorizationDialog({
  action,
  review,
  onClose,
  onApprove,
}: {
  action: string
  review: OperationReview
  onClose: () => void
  onApprove: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <CounterDialog
      title="Confirmar operación sensible"
      description={action}
      onClose={onClose}
    >
      <DetailsBox>
        <b>Solicita: {operatorName}</b>
        <p>{review.risks.join(' · ')}</p>
      </DetailsBox>
      <div className="flex max-h-[290px] flex-col gap-3 overflow-y-auto rounded-[10px] border border-[#e0e8f2] bg-[#f7f9fc] p-3 text-xs leading-[1.7] text-[#536e8d] md:p-4">
        {review.changes.map((change, index) => (
          <p
            key={`${change.entity}-${index}`}
            className="not-first:border-t not-first:border-[#e0e8f2] not-first:pt-3"
          >
            <strong>{change.entity}:</strong> {change.detail}
            {change.before && (
              <small className="block text-[11px] text-[#7b90aa]">
                {change.before} → {change.after}
              </small>
            )}
          </p>
        ))}
      </div>
      <Field label="Motivo de la operación">
        <FieldTextarea
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explica por qué se realiza este cambio"
        />
      </Field>
      <div className="mt-[5px] flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf4] pt-5">
        <ActionButton onClick={onClose}>Cancelar</ActionButton>
        <ActionButton
          tone="primary"
          disabled={!reason.trim()}
          onClick={onApprove}
        >
          Confirmar y registrar
        </ActionButton>
      </div>
    </CounterDialog>
  )
}

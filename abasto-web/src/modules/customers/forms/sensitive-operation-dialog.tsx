import { useState } from 'react'

import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerModal } from '#/modules/customers/components/customer-modal'
import { Field, TextArea } from '#/modules/customers/forms/form-field'

import type { CustomerReview } from '#/modules/customers/lib/customer-review'

type SensitiveOperationDialogProps = {
  requester: string
  customerName: string
  review: CustomerReview
  onCancel: () => void
  onConfirm: (reason: string) => void
}

/** Credit terms and commercial rules need a written reason before they are saved. */
export function SensitiveOperationDialog({
  requester,
  customerName,
  review,
  onCancel,
  onConfirm,
}: SensitiveOperationDialogProps) {
  const [reason, setReason] = useState('')

  return (
    <CustomerModal
      title="Confirmar operación sensible"
      description="Cliente guardado."
      onClose={onCancel}
    >
      <div className="rounded-[10px] bg-[#f5f8fc] px-[18px] py-4 text-[13px] leading-[1.8] text-[#637c99]">
        <b className="text-[#314f74]">Solicita: {requester}</b>
        <p>Condiciones comerciales o crédito</p>
      </div>
      <div className="flex max-h-[290px] flex-col gap-3 overflow-y-auto rounded-[10px] border border-[#e0e8f2] bg-[#f7f9fc] p-3 text-xs leading-[1.7] text-[#536e8d] md:p-4">
        <p>
          <strong>Clientes:</strong> {customerName}
          {review.before && (
            <small className="block text-[11px] text-[#7b90aa]">
              {review.before} → {review.after}
            </small>
          )}
        </p>
      </div>
      <Field label="Motivo de la operación">
        <TextArea
          rows={3}
          value={reason}
          placeholder="Explica por qué se realiza este cambio"
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="mt-[5px] flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf4] pt-5">
        <CustomerButton onClick={onCancel}>Cancelar</CustomerButton>
        <CustomerButton
          tone="primary"
          disabled={!reason.trim()}
          onClick={() => onConfirm(reason)}
        >
          Confirmar y registrar
        </CustomerButton>
      </div>
    </CustomerModal>
  )
}

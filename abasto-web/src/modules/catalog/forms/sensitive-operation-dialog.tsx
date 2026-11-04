import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import { Field, TextArea } from '#/modules/catalog/forms/form-field'

import type { CatalogReview } from '#/modules/catalog/lib/catalog-review'

type SensitiveOperationDialogProps = {
  requester: string
  /** Toast copy of the operation, shown as the dialog description. */
  action: string
  review: CatalogReview
  onCancel: () => void
  onConfirm: (reason: string) => void
}

/** Catalog edits need a written reason before they are registered. */
export function SensitiveOperationDialog({
  requester,
  action,
  review,
  onCancel,
  onConfirm,
}: SensitiveOperationDialogProps) {
  const [reason, setReason] = useState('')

  return (
    <CatalogModal
      title="Confirmar operación sensible"
      description={action}
      onClose={onCancel}
    >
      <div className="rounded-[10px] bg-[#f5f8fc] px-[18px] py-4 text-[13px] leading-[1.8] text-[#637c99]">
        <b className="text-[#314f74]">Solicita: {requester}</b>
        <p>{review.risks.join(' · ')}</p>
      </div>
      <div className="flex max-h-[290px] flex-col gap-3 overflow-y-auto rounded-[10px] border border-[#e0e8f2] bg-[#f7f9fc] p-3 text-xs leading-[1.7] text-[#536e8d] md:p-4">
        {review.changes.map((change, index) => (
          <p key={index}>
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
        <TextArea
          rows={3}
          value={reason}
          placeholder="Explica por qué se realiza este cambio"
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="mt-[5px] flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf4] pt-5">
        <CatalogButton onClick={onCancel}>Cancelar</CatalogButton>
        <CatalogButton
          tone="primary"
          disabled={!reason.trim()}
          onClick={() => onConfirm(reason)}
        >
          Confirmar y registrar
        </CatalogButton>
      </div>
    </CatalogModal>
  )
}

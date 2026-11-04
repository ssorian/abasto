import { useState } from 'react'

import { ActionButton } from '#/modules/reports/components/report-buttons'
import { ReportDialog } from '#/modules/reports/components/report-dialog'
import {
  Field,
  FieldTextarea,
} from '#/modules/reports/components/report-fields'
import { operatorName } from '#/modules/reports/lib/constants'

import type { SampleReview } from '#/modules/reports/types/reports'

/** First step: explains what the sample sales add before asking to load them. */
export function SampleSalesDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ReportDialog
      title="Cargar ventas de ejemplo"
      description="Se agregarán seis ventas entregadas y una devolución de prueba en el almacén Sur, repartidas entre hoy y las últimas cinco semanas. Tus operaciones se conservarán."
      onClose={onClose}
    >
      <ActionButton tone="primary" onClick={onConfirm}>
        Agregar ejemplos
      </ActionButton>
    </ReportDialog>
  )
}

/** Second step: lists what will change and requires a reason to register it. */
export function SensitiveOperationDialog({
  review,
  onClose,
  onApprove,
}: {
  review: SampleReview
  onClose: () => void
  onApprove: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <ReportDialog
      title="Confirmar operación sensible"
      description="Ventas de ejemplo agregadas."
      onClose={onClose}
    >
      <div className="rounded-[10px] bg-[#f5f8fc] px-[18px] py-4 text-[13px] leading-[1.8] text-[#637c99]">
        <b className="text-[#314f74]">Solicita: {operatorName}</b>
        <p>{review.risks.join(' · ')}</p>
      </div>
      <div className="flex max-h-[290px] flex-col gap-3 overflow-y-auto rounded-[10px] border border-[#e0e8f2] bg-[#f7f9fc] p-3 text-xs leading-[1.7] text-[#536e8d] md:p-4">
        {review.changes.map((change, index) => (
          <p key={`${change.entity}-${index}`}>
            <strong>{change.entity}:</strong> {change.detail}
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
    </ReportDialog>
  )
}

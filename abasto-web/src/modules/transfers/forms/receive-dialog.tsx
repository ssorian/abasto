import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { FieldInput } from '#/modules/inventory/components/form-controls'
import {
  FormError,
  WarningInline,
} from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useTransferActions } from '#/modules/transfers/hooks/use-transfer-actions'
import {
  receiveInputFromDraft,
  shortageOf,
} from '#/modules/transfers/lib/transfer-drafts'
import {
  receiveShortageWarning,
  unitCount,
} from '#/modules/transfers/lib/transfer-labels'
import type { TransferListItem } from '#/modules/transfers/services/transfer-reads'

type ReceiveDialogProps = {
  transfer: TransferListItem
  onClose: () => void
}

/** Per-line received quantities (start full); shows the shortage as it is typed. */
export function ReceiveDialog({ transfer, onClose }: ReceiveDialogProps) {
  const actions = useTransferActions()
  const [received, setReceived] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      transfer.lines.map((line) => [line.id, String(line.quantity)]),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  const drafts = transfer.lines.map((line) => ({
    lineId: line.id,
    sent: line.quantity,
    received: received[line.id] ?? '',
  }))
  const shortage = shortageOf(drafts)

  async function submit() {
    const parsed = receiveInputFromDraft(transfer.id, drafts)
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    const result = await actions.receive(parsed.value)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Recibir traslado"
      eyebrow={`DESDE ${transfer.fromWarehouseName.toUpperCase()}`}
      description="Escribe lo que llegó de cada lote. Lo que llegue entra a tu almacén con el mismo código, caducidad y costo."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {transfer.lines.map((line) => (
          <label
            key={line.id}
            className="grid gap-1.5 rounded-[10px] border border-[#efe9e3] p-4 text-[13px] font-medium text-[#513f45]"
          >
            <span>
              {line.productName}
              {line.lotCode ? ` · lote ${line.lotCode}` : ''}
            </span>
            <small className="text-[11px] font-normal text-[#9c888f]">
              Enviado: {unitCount(line.quantity, line.unit)}
              {line.expiresOn ? ` · caduca ${line.expiresOn}` : ''}
            </small>
            <FieldInput
              inputMode="numeric"
              aria-label={`Recibido de ${line.productName}`}
              value={received[line.id] ?? ''}
              onChange={(event) =>
                setReceived({ ...received, [line.id]: event.target.value })
              }
            />
          </label>
        ))}
        {shortage > 0 && (
          <WarningInline>
            {receiveShortageWarning(shortage, transfer.lines)}
          </WarningInline>
        )}
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={actions.pending}>
            {shortage > 0 ? 'Recibir con diferencia' : 'Recibir traslado'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

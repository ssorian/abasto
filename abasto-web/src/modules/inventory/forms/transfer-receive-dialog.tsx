import { useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldTextarea,
} from '#/modules/inventory/components/form-controls'
import { WarningInline } from '#/modules/inventory/components/info-blocks'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import { requireProduct } from '#/modules/inventory/lib/catalog'

import type { Transfer } from '#/modules/inventory/types/inventory'

type TransferReceiveDialogProps = {
  transfer: Transfer
  onClose: () => void
  /** Returns true when the reception was registered. */
  onConfirm: (quantities: Record<string, number>, note: string) => boolean
}

/** Confirms how much of each lot arrived at the destination. */
export function TransferReceiveDialog({
  transfer,
  onClose,
  onConfirm,
}: TransferReceiveDialogProps) {
  const product = requireProduct(transfer.productId)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      transfer.allocations.map((lot) => [lot.id, String(lot.qty)]),
    ),
  )
  const [note, setNote] = useState('')
  const received = transfer.allocations.reduce(
    (sum, lot) => sum + Number(values[lot.id] || 0),
    0,
  )
  const short = received < transfer.qty

  return (
    <InventoryDialog
      title="Confirmar recepción"
      description={`${transfer.id} · ${transfer.from} → ${transfer.to}`}
      onClose={onClose}
    >
      <p className="text-sm">
        Captura las {product.unit} recibidas de cada lote.
      </p>
      {transfer.allocations.map((lot) => (
        <Field
          key={lot.id}
          label={`${lot.code || 'Sin lote'} · ${lot.qty} enviadas`}
        >
          <FieldInput
            aria-label={`Recibidas ${lot.code}`}
            type="number"
            min="0"
            max={lot.qty}
            value={values[lot.id]}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [lot.id]: event.target.value,
              }))
            }
          />
        </Field>
      ))}
      <div className="flex items-center justify-between rounded-[8px] bg-[#f4f7fb] p-[17px] text-[13px] text-[#7b90a8]">
        <span>Total recibido</span>
        <strong className="text-xl font-semibold">
          {received} / {transfer.qty}
        </strong>
      </div>
      {short && (
        <WarningInline>
          <TriangleAlertIcon size={17} />
          {transfer.qty - received} faltantes. Se cerrará el traslado y se
          registrará la diferencia; no estarán disponibles en ningún almacén.
        </WarningInline>
      )}
      <Field
        label={
          short ? 'Motivo de la diferencia · obligatorio' : 'Nota de recepción'
        }
      >
        <FieldTextarea
          aria-label="Nota de recepción"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <ActionButton
        tone="primary"
        onClick={() => {
          const quantities = Object.fromEntries(
            Object.entries(values).map(([id, value]) => [
              id,
              value === '' ? Number.NaN : Number(value),
            ]),
          )
          if (onConfirm(quantities, note)) onClose()
        }}
      >
        Confirmar recepción
      </ActionButton>
    </InventoryDialog>
  )
}

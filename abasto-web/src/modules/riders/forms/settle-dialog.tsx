import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { Field, FieldInput } from '#/modules/inventory/components/form-controls'
import {
  FormError,
  WarningInline,
} from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { cn } from '#/lib/utils/cn'
import { formatCents } from '#/modules/pricing/lib/money'
import { useRiderActions } from '#/modules/riders/hooks/use-rider-actions'
import { describeQuantity } from '#/modules/riders/lib/box-quantities'
import { differenceLabel } from '#/modules/riders/lib/assignment-view'
import { exactAmountText } from '#/modules/riders/lib/exact-amount'
import { previewSettlement } from '#/modules/riders/lib/settlement-preview'
import type { AssignmentDetail } from '#/modules/riders/services/assignment-reads'

type SettleDialogProps = {
  assignment: AssignmentDetail
  /** Settling posts the sale in the open cash session. */
  cashOpen: boolean
  onClose: () => void
}

type Typed = Record<string, { boxes: string; units: string }>

/** Per product: what was assigned, what came back and what was sold; then the cash. */
export function SettleDialog({
  assignment,
  cashOpen,
  onClose,
}: SettleDialogProps) {
  const actions = useRiderActions()
  const [typed, setTyped] = useState<Typed>({})
  const [delivered, setDelivered] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const leftoverOf = (lineId: string) =>
    typed[lineId] ?? { boxes: '', units: '' }
  const preview = previewSettlement(
    assignment.lines.map((line) => ({
      assignedQuantity: line.assignedQuantity,
      boxFactor: line.boxFactor,
      allocations: line.allocations,
      ...leftoverOf(line.id),
    })),
    delivered,
  )

  async function submit() {
    if (!preview.valid || preview.deliveredCents === null) {
      return setError(
        preview.deliveredError ??
          'Revisa lo que regresó de cada producto y el dinero entregado.',
      )
    }
    setError(null)
    setPending(true)
    const result = await actions.settle({
      assignmentId: assignment.id,
      deliveredCents: preview.deliveredCents,
      lines: assignment.lines.map((line) => {
        const { boxes, units } = leftoverOf(line.id)
        return {
          lineId: line.id,
          boxes: Number(boxes || 0),
          units: Number(units || 0),
        }
      }),
    })
    setPending(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title={`Liquidar reparto de ${assignment.riderName}`}
      description="Escribe lo que regresó de cada producto y el dinero que entregó. Lo que regresó vuelve al almacén y el resto se vende. A la caja entra el dinero entregado; la diferencia queda en el reparto."
      onClose={onClose}
      size="count"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {!cashOpen && (
          <WarningInline>
            Abre la caja en Mostrador para liquidar.{' '}
            <Link to="/mostrador" className="font-semibold underline">
              Ir a Mostrador
            </Link>
          </WarningInline>
        )}
        {assignment.lines.map((line, index) => {
          const row = preview.lines[index]
          const { boxes, units } = leftoverOf(line.id)
          const update = (change: Partial<{ boxes: string; units: string }>) =>
            setTyped({ ...typed, [line.id]: { boxes, units, ...change } })
          return (
            <div
              key={line.id}
              className="grid gap-3 rounded-[10px] border border-[#efe9e3] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-[#5f4a51]">{line.productName}</strong>
                <small className="text-[#907e84]">
                  Asignado:{' '}
                  {describeQuantity(line.assignedQuantity, line.boxFactor)} ·
                  caja = {line.boxFactor} unidades
                </small>
              </div>
              <div className="grid items-end gap-3 md:grid-cols-[110px_110px_minmax(0,1fr)]">
                <Field label="Regresó (cajas)">
                  <FieldInput
                    inputMode="numeric"
                    placeholder="0"
                    value={boxes}
                    onChange={(event) => update({ boxes: event.target.value })}
                  />
                </Field>
                <Field label="Regresó (unidades)">
                  <FieldInput
                    inputMode="numeric"
                    placeholder="0"
                    value={units}
                    onChange={(event) => update({ units: event.target.value })}
                  />
                </Field>
                <p className="pb-2.5 text-sm text-[#785e67]">
                  {row.error ? (
                    <span role="alert" className="text-[#b26357]">
                      {row.error}
                    </span>
                  ) : (
                    <>
                      Vendió{' '}
                      <strong>
                        {describeQuantity(row.sold, line.boxFactor)}
                      </strong>{' '}
                      · {formatCents(row.expectedCents)}
                    </>
                  )}
                </p>
              </div>
            </div>
          )
        })}
        <div className="grid items-end gap-4 md:grid-cols-3">
          <Figure
            label="Monto esperado"
            value={formatCents(preview.expectedCents)}
          />
          <div className="flex flex-col gap-[7px]">
            <Field label="Dinero entregado (pesos)">
              <FieldInput
                inputMode="decimal"
                placeholder="0.00"
                value={delivered}
                onChange={(event) => setDelivered(event.target.value)}
              />
            </Field>
            <ActionButton
              type="button"
              className="min-h-9 self-start px-3"
              disabled={preview.lines.some((row) => row.error)}
              onClick={() =>
                setDelivered(exactAmountText(preview.expectedCents))
              }
            >
              Exacto
            </ActionButton>
          </div>
          <Figure
            label="Diferencia"
            value={
              preview.differenceCents === null
                ? '—'
                : differenceLabel(preview.differenceCents)
            }
            tone={preview.kind}
          />
        </div>
        {delivered !== '' && preview.deliveredError && (
          <p role="alert" className="text-xs text-[#b26357]">
            {preview.deliveredError}
          </p>
        )}
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton
            tone="primary"
            type="submit"
            disabled={pending || !cashOpen}
          >
            Liquidar reparto
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'exact' | 'shortage' | 'surplus' | null
}) {
  return (
    <div>
      <span className="block text-[13px] font-medium text-[#513f45]">
        {label}
      </span>
      <strong
        className={cn(
          'text-lg font-[650] text-[#3b2251] tabular-nums',
          tone === 'shortage' && 'text-[#b26357]',
          tone === 'surplus' && 'text-[#a08442]',
          tone === 'exact' && 'text-[#198567]',
        )}
      >
        {value}
      </strong>
    </div>
  )
}

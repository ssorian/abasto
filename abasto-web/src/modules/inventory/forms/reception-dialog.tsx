import { useEffect, useMemo, useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { ExpiryField } from '#/modules/inventory/components/expiry-field'
import { FieldInput } from '#/modules/inventory/components/form-controls'
import {
  FormError,
  SuccessNote,
  WarningInline,
} from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import {
  goodBoxes,
  initialReception,
  receptionInputFromDraft,
  missingExpiry,
  receptionIssues,
  receptionSummary,
  receptionSummaryText,
  replacementBoxes,
  toggleReceived,
} from '#/modules/inventory/lib/reception-draft'
import type {
  ReceptionDraft,
  ReceptionLine,
} from '#/modules/inventory/lib/reception-draft'
import type {
  SupplierOrder,
  SupplierOrderSummary,
} from '#/modules/inventory/services/supplier-orders'
import type { PendingBalance } from '#/modules/inventory/services/supplier-pendings'

type ReceptionDialogProps = {
  order: SupplierOrderSummary
  /** Open "Por reponer" balances of every supplier; the dialog keeps this order's supplier. */
  restock: ReadonlyArray<PendingBalance>
  onClose: () => void
}

const compact = 'min-h-[38px] px-2 py-1.5'
const boxes = (count: number) => `${count} ${count === 1 ? 'caja' : 'cajas'}`

/** Verifies a waiting order from its exceptions only, plus earlier missing boxes that arrived with it. */
export function ReceptionDialog({
  order,
  restock,
  onClose,
}: ReceptionDialogProps) {
  const actions = useInventoryActions()
  const [detail, setDetail] = useState<SupplierOrder>()
  const [draft, setDraft] = useState<ReceptionDraft>({
    lines: {},
    replacements: {},
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    let current = true
    void actions.loadOrder(order.id).then((loaded) => {
      if (!current) return
      if (!loaded) return onClose()
      setDetail(loaded)
      setDraft(initialReception(receptionLines(loaded)))
    })
    return () => {
      current = false
    }
  }, [order.id])

  const owedHere = useMemo(
    () => restock.filter((row) => row.supplierId === order.supplierId),
    [restock, order.supplierId],
  )
  const owedBoxes = useMemo(
    () =>
      Object.fromEntries(owedHere.map((row) => [row.pendingId, row.owedBoxes])),
    [owedHere],
  )
  const lines = detail ? receptionLines(detail) : []
  const allIssues = receptionIssues(lines, draft, owedBoxes)
  // A missing expiry is only flagged once the user tries to confirm.
  const issues = Object.fromEntries(
    Object.entries(allIssues).filter(
      ([, issue]) => attempted || issue !== missingExpiry,
    ),
  )
  const summary = receptionSummary(lines, draft)
  const summaryText = receptionSummaryText({
    ...summary,
    replaced: replacementBoxes(draft),
  })

  const patchLine = (
    lineId: string,
    patch: Partial<ReceptionDraft['lines'][string] & object>,
  ) =>
    setDraft((current) => ({
      ...current,
      lines: {
        ...current.lines,
        [lineId]: {
          missing: '0',
          damaged: '0',
          expiresOn: '',
          ...current.lines[lineId],
          ...patch,
        },
      },
    }))
  const patchReplacement = (
    pendingId: string,
    patch: Partial<NonNullable<ReceptionDraft['replacements'][string]>>,
  ) =>
    setDraft((current) => ({
      ...current,
      replacements: {
        ...current.replacements,
        [pendingId]: {
          boxes: '',
          expiresOn: '',
          ...current.replacements[pendingId],
          ...patch,
        },
      },
    }))

  async function submit() {
    setAttempted(true)
    const parsed = receptionInputFromDraft(order.id, lines, draft, owedBoxes)
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    setPending(true)
    const saved = await actions.receiveOrder(parsed.value, setError)
    setPending(false)
    if (saved) setDone(`${summaryText}.`)
  }

  if (done) {
    return (
      <InventoryDialog
        title="Pedido recibido"
        description="Las existencias ya están actualizadas."
        onClose={onClose}
      >
        <SuccessNote>{done}</SuccessNote>
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Listo
          </ActionButton>
        </DialogActions>
      </InventoryDialog>
    )
  }

  return (
    <InventoryDialog
      title="Recibir pedido"
      eyebrow={order.supplierName.toUpperCase()}
      description={`Todo llega bien salvo lo que captures. Lote automático: ${order.code}. Indica la caducidad de lo que entra o marca «Sin caducidad». Las faltantes quedan «Por reponer» con el proveedor; las dañadas o caducadas quedan «Por devolver» y no entran al inventario.`}
      size="wide"
      onClose={onClose}
    >
      {!detail ? (
        <p className="py-6 text-center text-sm text-[#907e84]">Cargando…</p>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <ListPanel className="max-h-[360px] overflow-auto">
            <ListTable className="min-w-[820px]">
              <ListHead>
                {[
                  'Producto',
                  'Pedidas',
                  'Faltantes',
                  'Dañadas / caducadas',
                  'Buenas',
                  'Caducidad',
                ]}
              </ListHead>
              <ListBody>
                {detail.lines.map((line) => {
                  const entry = draft.lines[line.id]
                  const issue = issues[line.id]
                  return (
                    <ListRow key={line.id} className="align-top">
                      <ListCell>
                        <strong>{line.productName}</strong>
                        <small className="block text-[#907e84]">
                          {line.sku}
                        </small>
                        {issue && (
                          <small className="block max-w-[220px] text-[#b3261e]">
                            {issue}
                          </small>
                        )}
                      </ListCell>
                      <ListCell>{line.boxes}</ListCell>
                      <ListCell>
                        <FieldInput
                          inputMode="numeric"
                          aria-label={`Cajas faltantes de ${line.productName}`}
                          aria-invalid={issue ? true : undefined}
                          className={`${compact} w-[76px]`}
                          value={entry?.missing ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, { missing: event.target.value })
                          }
                        />
                      </ListCell>
                      <ListCell>
                        <FieldInput
                          inputMode="numeric"
                          aria-label={`Cajas dañadas o caducadas de ${line.productName}`}
                          aria-invalid={issue ? true : undefined}
                          className={`${compact} w-[76px]`}
                          value={entry?.damaged ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, { damaged: event.target.value })
                          }
                        />
                      </ListCell>
                      <ListCell>
                        <strong
                          aria-label={`Cajas buenas de ${line.productName}`}
                        >
                          {goodBoxes(
                            line.boxes,
                            entry?.missing ?? '',
                            entry?.damaged ?? '',
                          )}
                        </strong>
                      </ListCell>
                      <ListCell>
                        <ExpiryField
                          label={line.productName}
                          className={`${compact} w-[140px]`}
                          expiresOn={entry?.expiresOn ?? ''}
                          noExpiry={entry?.noExpiry ?? false}
                          invalid={Boolean(issue)}
                          onChange={(value) => patchLine(line.id, value)}
                        />
                      </ListCell>
                    </ListRow>
                  )
                })}
              </ListBody>
            </ListTable>
          </ListPanel>

          {owedHere.length > 0 && (
            <section className="grid gap-2.5">
              <h3 className="text-sm font-[650] text-[#5f4a51]">
                Faltantes de pedidos anteriores
              </h3>
              <p className="text-xs text-[#9c898f]">
                {order.supplierName} te debe estas cajas. Si llegaron con este
                pedido, escribe cuántas o márcalas como recibidas. Entran como
                lote al costo original.
              </p>
              <ListPanel className="overflow-auto">
                <ListTable className="min-w-[760px]">
                  <ListHead>
                    {[
                      'Producto',
                      'Pedido',
                      'Debe',
                      'Llegaron',
                      'Caducidad',
                      '',
                    ]}
                  </ListHead>
                  <ListBody>
                    {owedHere.map((row) => {
                      const entry = draft.replacements[row.pendingId]
                      const issue = issues[row.pendingId]
                      const received =
                        entry?.boxes.trim() === String(row.owedBoxes)
                      return (
                        <ListRow key={row.pendingId} className="align-top">
                          <ListCell>
                            <strong>{row.productName}</strong>
                            {issue && (
                              <small className="block text-[#b3261e]">
                                {issue}
                              </small>
                            )}
                          </ListCell>
                          <ListCell>{row.originCode}</ListCell>
                          <ListCell>
                            {boxes(row.owedBoxes)}
                            <small className="block text-[#907e84]">
                              {formatCents(row.owedValueCents)}
                            </small>
                          </ListCell>
                          <ListCell>
                            <FieldInput
                              inputMode="numeric"
                              aria-label={`Llegaron cajas de ${row.productName} (${row.originCode})`}
                              aria-invalid={issue ? true : undefined}
                              className={`${compact} w-[76px]`}
                              placeholder="0"
                              value={entry?.boxes ?? ''}
                              onChange={(event) =>
                                patchReplacement(row.pendingId, {
                                  boxes: event.target.value,
                                })
                              }
                            />
                          </ListCell>
                          <ListCell>
                            <ExpiryField
                              label={`reposición de ${row.productName} (${row.originCode})`}
                              className={`${compact} w-[140px]`}
                              expiresOn={entry?.expiresOn ?? ''}
                              noExpiry={entry?.noExpiry ?? false}
                              invalid={Boolean(issue)}
                              onChange={(value) =>
                                patchReplacement(row.pendingId, value)
                              }
                            />
                          </ListCell>
                          <ListCell>
                            <ActionButton
                              type="button"
                              aria-pressed={received}
                              className="min-h-9 px-3"
                              tone={received ? 'primary' : 'secondary'}
                              onClick={() =>
                                setDraft((current) => ({
                                  ...current,
                                  replacements: toggleReceived(
                                    current.replacements,
                                    row.pendingId,
                                    row.owedBoxes,
                                  ),
                                }))
                              }
                            >
                              {received ? 'Recibido ✓' : 'Recibido'}
                            </ActionButton>
                          </ListCell>
                        </ListRow>
                      )
                    })}
                  </ListBody>
                </ListTable>
              </ListPanel>
            </section>
          )}

          <WarningInline className="mt-0">
            {summaryText}. Al confirmar, el pedido se cierra y ya no se puede
            editar.
          </WarningInline>
          {error && <FormError>{error}</FormError>}
          <DialogActions>
            <ActionButton type="button" onClick={onClose}>
              Cancelar
            </ActionButton>
            <ActionButton tone="primary" type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Confirmar recepción'}
            </ActionButton>
          </DialogActions>
        </form>
      )}
    </InventoryDialog>
  )
}

function receptionLines(order: SupplierOrder): Array<ReceptionLine> {
  return order.lines.map((line) => ({
    lineId: line.id,
    productId: line.productId,
    orderedBoxes: line.boxes,
  }))
}

import { useEffect, useMemo, useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
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
  initialReception,
  missingBoxes,
  receptionInputFromDraft,
  receptionIssues,
  receptionSummary,
} from '#/modules/inventory/lib/reception-draft'
import type {
  ReceptionDraft,
  ReceptionLine,
} from '#/modules/inventory/lib/reception-draft'
import type {
  SupplierOrder,
  SupplierOrderSummary,
} from '#/modules/inventory/services/supplier-orders'
import type { OwedPending } from '#/modules/inventory/services/supplier-pendings'

type ReceptionDialogProps = {
  order: SupplierOrderSummary
  /** Everything every supplier owes; the dialog keeps this order's supplier. */
  owed: ReadonlyArray<OwedPending>
  onClose: () => void
}

const compact = 'min-h-[38px] px-2 py-1.5'
const boxes = (count: number) => `${count} ${count === 1 ? 'caja' : 'cajas'}`

/** Verifies a waiting order: good, damaged and missing boxes per line, plus replacements. */
export function ReceptionDialog({
  order,
  owed,
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
    () => owed.filter((row) => row.supplierId === order.supplierId),
    [owed, order.supplierId],
  )
  const owedBoxes = useMemo(
    () =>
      Object.fromEntries(owedHere.map((row) => [row.productId, row.owedBoxes])),
    [owedHere],
  )
  const lines = detail ? receptionLines(detail) : []
  const issues = receptionIssues(lines, draft, owedBoxes)
  const summary = receptionSummary(lines, draft)

  const patchLine = (
    lineId: string,
    patch: Partial<ReceptionDraft['lines'][string] & object>,
  ) =>
    setDraft((current) => ({
      ...current,
      lines: {
        ...current.lines,
        [lineId]: {
          good: '',
          damaged: '',
          lotCode: '',
          expiresOn: '',
          ...current.lines[lineId],
          ...patch,
        },
      },
    }))
  const patchReplacement = (
    productId: string,
    patch: Partial<NonNullable<ReceptionDraft['replacements'][string]>>,
  ) =>
    setDraft((current) => ({
      ...current,
      replacements: {
        ...current.replacements,
        [productId]: {
          boxes: '',
          lotCode: '',
          expiresOn: '',
          ...current.replacements[productId],
          ...patch,
        },
      },
    }))

  async function submit() {
    const parsed = receptionInputFromDraft(order.id, lines, draft, owedBoxes)
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    setPending(true)
    const saved = await actions.receiveOrder(parsed.value)
    setPending(false)
    if (!saved) return
    const entered = saved.data.lots.length + saved.data.replacementLots.length
    setDone(
      `Entraron ${boxes(summary.good)} buenas${entered ? ` en ${entered} ${entered === 1 ? 'lote' : 'lotes'}` : ''}. ` +
        (summary.damaged + summary.missing
          ? `Quedaron pendientes con el proveedor: ${boxes(summary.damaged)} dañadas o caducadas y ${boxes(summary.missing)} faltantes.`
          : 'No quedó nada pendiente con el proveedor.'),
    )
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
      description="Revisa lo que llegó de cada producto. Lo dañado, caducado o faltante queda como saldo del proveedor. Cada línea con cajas buenas crea su lote."
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
            <ListTable className="min-w-[860px]">
              <ListHead>
                {[
                  'Producto',
                  'Pedidas',
                  'Buenas',
                  'Dañadas / caducadas',
                  'Faltantes',
                  'Lote',
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
                          aria-label={`Cajas buenas de ${line.productName}`}
                          aria-invalid={issue ? true : undefined}
                          className={`${compact} w-[76px]`}
                          value={entry?.good ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, { good: event.target.value })
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
                        {missingBoxes(
                          line.boxes,
                          entry?.good ?? '',
                          entry?.damaged ?? '',
                        )}
                      </ListCell>
                      <ListCell>
                        <FieldInput
                          aria-label={`Lote de ${line.productName}`}
                          className={`${compact} w-[100px]`}
                          value={entry?.lotCode ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, { lotCode: event.target.value })
                          }
                        />
                      </ListCell>
                      <ListCell>
                        <FieldInput
                          type="date"
                          aria-label={`Caducidad de ${line.productName}`}
                          className={`${compact} w-[140px]`}
                          value={entry?.expiresOn ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, {
                              expiresOn: event.target.value,
                            })
                          }
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
                Reposiciones
              </h3>
              <p className="text-xs text-[#9c898f]">
                {order.supplierName} te debe estas cajas. Si en este pedido
                llegó producto para reponerlas, escribe cuántas. Entran como
                lote al costo original.
              </p>
              <ListPanel className="overflow-auto">
                <ListTable className="min-w-[720px]">
                  <ListHead>
                    {[
                      'Producto',
                      'Debe',
                      'Cajas repuestas',
                      'Lote',
                      'Caducidad',
                    ]}
                  </ListHead>
                  <ListBody>
                    {owedHere.map((row) => {
                      const entry = draft.replacements[row.productId]
                      const issue = issues[row.productId]
                      return (
                        <ListRow key={row.productId} className="align-top">
                          <ListCell>
                            <strong>{row.productName}</strong>
                            {issue && (
                              <small className="block text-[#b3261e]">
                                {issue}
                              </small>
                            )}
                          </ListCell>
                          <ListCell>
                            {boxes(row.owedBoxes)}
                            <small className="block text-[#907e84]">
                              {formatCents(row.owedValueCents)}
                            </small>
                          </ListCell>
                          <ListCell>
                            <FieldInput
                              inputMode="numeric"
                              aria-label={`Cajas repuestas de ${row.productName}`}
                              aria-invalid={issue ? true : undefined}
                              className={`${compact} w-[76px]`}
                              placeholder="0"
                              value={entry?.boxes ?? ''}
                              onChange={(event) =>
                                patchReplacement(row.productId, {
                                  boxes: event.target.value,
                                })
                              }
                            />
                          </ListCell>
                          <ListCell>
                            <FieldInput
                              aria-label={`Lote de reposición de ${row.productName}`}
                              className={`${compact} w-[100px]`}
                              value={entry?.lotCode ?? ''}
                              onChange={(event) =>
                                patchReplacement(row.productId, {
                                  lotCode: event.target.value,
                                })
                              }
                            />
                          </ListCell>
                          <ListCell>
                            <FieldInput
                              type="date"
                              aria-label={`Caducidad de reposición de ${row.productName}`}
                              className={`${compact} w-[140px]`}
                              value={entry?.expiresOn ?? ''}
                              onChange={(event) =>
                                patchReplacement(row.productId, {
                                  expiresOn: event.target.value,
                                })
                              }
                            />
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
            Entran {boxes(summary.good)} buenas. Quedarán pendientes con el
            proveedor: {boxes(summary.damaged)} dañadas o caducadas y{' '}
            {boxes(summary.missing)} faltantes. Al confirmar, el pedido se
            cierra y ya no se puede editar.
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

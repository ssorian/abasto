import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { ProductImage } from '#/components/product-image'
import { SearchBox } from '#/components/search-box'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { ExpiryField } from '#/modules/inventory/components/expiry-field'
import { FieldInput } from '#/modules/inventory/components/form-controls'
import {
  FormError,
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
import { businessDate } from '#/modules/orders/services/clock'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import { boxCountLabel } from '#/modules/inventory/lib/order-rows'
import {
  emptyLine,
  expiredEntries,
  goodBoxes,
  missingBoxes,
  surplusBoxes,
  initialReception,
  receptionInputFromDraft,
  missingExpiry,
  receptionIssues,
  receptionOutcome,
  receptionTotals,
  toggleReceived,
} from '#/modules/inventory/lib/reception-draft'
import {
  changedPiecePrice,
  lineTotalCents,
  piecePriceText,
} from '#/modules/inventory/lib/reception-price'
import {
  addExtra,
  extraIssues,
  extraLineOf,
  extraTotalCents,
  extrasInput,
  removeExtra,
} from '#/modules/inventory/lib/reception-extras-draft'
import type { ExtrasDraft } from '#/modules/inventory/lib/reception-extras-draft'
import { supplierProducts } from '#/modules/inventory/lib/supplier-order-draft'
import { formatTenThousandths } from '#/lib/utils/supplier-cost'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
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
  /** Catalog products; the dialog offers the order's supplier ones as unordered arrivals. */
  products: ReadonlyArray<CatalogProduct>
  onClose: () => void
}

const compact = 'min-h-[38px] px-2 py-1.5'
const unitWord = (factor: number) => (factor < 2 ? 'Piezas' : 'Cajas')

/** Verifies a waiting order from its exceptions only, plus earlier missing boxes that arrived with it. */
export function ReceptionDialog({
  order,
  restock,
  products,
  onClose,
}: ReceptionDialogProps) {
  const actions = useInventoryActions()
  const [detail, setDetail] = useState<SupplierOrder>()
  const [draft, setDraft] = useState<ReceptionDraft>({
    lines: {},
    replacements: {},
  })
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [confirmExpired, setConfirmExpired] = useState(false)
  const [updateCatalog, setUpdateCatalog] = useState(true)
  const [extras, setExtras] = useState<ExtrasDraft>({})
  const [query, setQuery] = useState('')
  const [showExtras, setShowExtras] = useState(false)

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
  const outcome = receptionOutcome(lines, draft, owedBoxes)
  const today = businessDate()
  const expired = expiredEntries(lines, draft, today)
  const onOrder = new Set(lines.map((line) => line.productId))
  const extraLines = products
    .filter((product) => extras[product.id])
    .map(extraLineOf)
  const allExtraIssues = extraIssues(extraLines, extras)
  const shownExtraIssues = Object.fromEntries(
    Object.entries(allExtraIssues).filter(
      ([, issue]) => attempted || issue !== missingExpiry,
    ),
  )
  const extrasBlocked = Object.values(allExtraIssues).some(
    (issue) => issue !== missingExpiry,
  )
  const parsedExtras = extrasInput(extraLines, extras, today)
  const extrasExpired = parsedExtras.ok && parsedExtras.value.expired
  const extrasRepriced = extraLines.some(
    (line) =>
      changedPiecePrice(
        { orderedBoxes: 1, boxFactor: line.boxFactor, price: line.price },
        extras[line.productId]?.price,
      ) !== undefined,
  )
  const extrasCents = extraLines.reduce(
    (sum, line) => sum + (extraTotalCents(line, extras[line.productId]!) ?? 0),
    0,
  )
  const extraBoxes = extraLines.reduce(
    (sum, line) => sum + (Number(extras[line.productId]?.boxes) || 0),
    0,
  )
  // Every product of the order's supplier is listed up front; the search only narrows it.
  const candidates = supplierProducts(products, order.supplierId, query).filter(
    (product) => !onOrder.has(product.id) && !extras[product.id],
  )
  const mustConfirmExpired =
    outcome.canConfirm && (expired.length > 0 || extrasExpired)
  const totals = receptionTotals(lines, draft)
  const grandTotalCents = totals.totalCents + extrasCents
  const discountCents = detail?.discountCents ?? 0
  const summary = `${outcome.summary}${
    extraBoxes > 0 ? ` · ${extraBoxes} sin pedido` : ''
  }`

  const patchLine = (
    lineId: string,
    patch: Partial<ReceptionDraft['lines'][string] & object>,
  ) =>
    setDraft((current) => ({
      ...current,
      lines: {
        ...current.lines,
        [lineId]: {
          ...emptyLine({
            orderedBoxes: lines.find((line) => line.lineId === lineId)!
              .orderedBoxes,
          }),
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
    const parsed = receptionInputFromDraft(order.id, lines, draft, owedBoxes, {
      today,
      confirmExpired,
      updateCatalogPrices: updateCatalog,
    })
    if (!parsed.ok) return setError(parsed.message)
    const added = extrasInput(extraLines, extras, today)
    if (!added.ok) return setError(added.message)
    if (added.value.expired && !confirmExpired) {
      return setError('Confirma que quieres recibir producto caducado.')
    }
    setError(null)
    const input = {
      ...parsed.value,
      ...(added.value.extras.length > 0 ? { extras: added.value.extras } : {}),
      ...(added.value.expired ? { confirmExpired: true } : {}),
      ...(updateCatalog && added.value.changed > 0
        ? { updateCatalogPrices: true }
        : {}),
    }
    const saved = await actions.receiveOrder(
      input,
      `Pedido recibido. ${summary}.`,
    )
    if (saved) onClose()
  }

  return (
    <InventoryDialog
      title="Recibir pedido"
      eyebrow={order.supplierName.toUpperCase()}
      description={`Todo llega bien salvo lo que captures. Lote automático: ${order.code}.`}
      size="wider"
      onClose={onClose}
      footer={
        detail ? (
          <>
            <p className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-[#5f4a51]">
              <span>
                Total del pedido <strong>{formatCents(grandTotalCents)}</strong>
              </span>
              {discountCents > 0 && (
                <>
                  <span>
                    Descuento por faltantes{' '}
                    <strong>−{formatCents(discountCents)}</strong>
                  </span>
                  <span>
                    A pagar{' '}
                    <strong>
                      {formatCents(grandTotalCents - discountCents)}
                    </strong>
                  </span>
                </>
              )}
            </p>
            <WarningInline className="mt-0">
              {outcome.canConfirm
                ? `${summary}. Al confirmar, el pedido se cierra y ya no se puede editar.`
                : outcome.summary}
            </WarningInline>
            {mustConfirmExpired && (
              <label
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#e3b9bd] bg-[#fbecee] p-3 text-sm text-[#8f2d36]"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmExpired}
                  onChange={(event) => setConfirmExpired(event.target.checked)}
                />
                <span>
                  <strong>Caducidad vencida.</strong> Estás recibiendo producto
                  que ya caducó y entrará al inventario como «Vencido». Marca la
                  casilla para confirmar que quieres recibirlo.
                </span>
              </label>
            )}
            {error && <FormError>{error}</FormError>}
            <DialogActions className="mt-0 border-t-0 pt-0">
              <ActionButton type="button" onClick={onClose}>
                Cancelar
              </ActionButton>
              <ActionButton
                tone="primary"
                type="submit"
                form="reception-form"
                disabled={
                  actions.pending ||
                  !outcome.canConfirm ||
                  extrasBlocked ||
                  (mustConfirmExpired && !confirmExpired)
                }
              >
                {actions.pending ? 'Guardando…' : 'Confirmar recepción'}
              </ActionButton>
            </DialogActions>
          </>
        ) : undefined
      }
    >
      {!detail ? (
        <p className="py-6 text-center text-sm text-[#907e84]">Cargando…</p>
      ) : (
        <form
          id="reception-form"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <p className="text-xs text-[#9c898f]">
            «Recibidas» empieza en las cajas pedidas; corrígelo si llegaron
            otras. Si son menos que las pedidas, la diferencia queda «Por
            reponer»; si son más, las de más entran al inventario sin costo y no
            suben lo que debes. Las dañadas o caducadas salen de las recibidas,
            quedan «Por devolver» y no entran. Si el proveedor cobró otro costo
            por pieza, corrígelo. Indica la caducidad de lo que entra o marca
            «Sin caducidad».
          </p>
          <ListPanel className="overflow-auto">
            <ListTable>
              <ListHead>
                {[
                  'Producto',
                  'Pedidas',
                  'Costo por pieza',
                  'Total',
                  'Recibidas',
                  'Dañadas / caducadas',
                  'Buenas',
                  'Caducidad',
                ]}
              </ListHead>
              <ListBody>
                {detail.lines.map((line) => {
                  const entry = draft.lines[line.id]
                  const issue = issues[line.id]
                  const priced = lines.find((item) => item.lineId === line.id)!
                  const lineTotal = lineTotalCents(priced, entry?.price)
                  const repriced =
                    changedPiecePrice(priced, entry?.price) !== undefined
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
                      <ListCell>
                        {boxCountLabel(line.boxes, line.boxFactor)}
                      </ListCell>
                      <ListCell>
                        <FieldInput
                          inputMode="decimal"
                          aria-label={`Costo por pieza de ${line.productName}`}
                          aria-invalid={issue ? true : undefined}
                          className={`${compact} w-[88px]`}
                          value={entry?.price ?? piecePriceText(priced)}
                          onChange={(event) =>
                            patchLine(line.id, { price: event.target.value })
                          }
                        />
                        {repriced && (
                          <small className="block text-[#907e84]">
                            Pedido a $
                            {formatTenThousandths(line.listPricePerPiece)}
                          </small>
                        )}
                      </ListCell>
                      <ListCell>
                        <strong aria-label={`Total de ${line.productName}`}>
                          {lineTotal === null ? '—' : formatCents(lineTotal)}
                        </strong>
                      </ListCell>
                      <ListCell>
                        <FieldInput
                          inputMode="numeric"
                          aria-label={`${unitWord(line.boxFactor)} recibidas de ${line.productName}`}
                          aria-invalid={issue ? true : undefined}
                          className={`${compact} w-[64px]`}
                          value={entry?.received ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, { received: event.target.value })
                          }
                        />
                        {missingBoxes(line.boxes, entry?.received ?? '') >
                          0 && (
                          <small className="block text-[#907e84]">
                            Por reponer:{' '}
                            {missingBoxes(line.boxes, entry?.received ?? '')}
                          </small>
                        )}
                        {surplusBoxes(line.boxes, entry?.received ?? '') >
                          0 && (
                          <small className="block text-[#907e84]">
                            {surplusBoxes(line.boxes, entry?.received ?? '')} de
                            más, sin costo
                          </small>
                        )}
                      </ListCell>
                      <ListCell>
                        <FieldInput
                          inputMode="numeric"
                          aria-label={`${unitWord(line.boxFactor)} dañadas o caducadas de ${line.productName}`}
                          aria-invalid={issue ? true : undefined}
                          className={`${compact} w-[64px]`}
                          value={entry?.damaged ?? ''}
                          onChange={(event) =>
                            patchLine(line.id, { damaged: event.target.value })
                          }
                        />
                      </ListCell>
                      <ListCell>
                        <strong
                          aria-label={`${unitWord(line.boxFactor)} buenas de ${line.productName}`}
                        >
                          {goodBoxes(
                            entry?.received ?? '',
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

          {!showExtras && Object.keys(extras).length === 0 ? (
            <div>
              <ActionButton
                type="button"
                tone="secondary"
                onClick={() => setShowExtras(true)}
              >
                <PlusIcon size={18} />
                Agregar algo que llegó sin pedirlo
              </ActionButton>
            </div>
          ) : (
            <section className="grid gap-2.5">
              <h3 className="text-sm font-[650] text-[#5f4a51]">
                Llegó sin pedirlo
              </h3>
              <p className="text-xs text-[#9c898f]">
                Productos de {order.supplierName} que llegaron sin pedirlos.
                Entran completos al inventario con el código del pedido.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  aria-label="Proveedor del pedido"
                  className="inline-flex h-[45px] items-center rounded-[9px] border border-[#eee7e0] bg-[#faf7f4] px-3.5 text-sm text-[#5f4a51] md:h-11"
                >
                  {order.supplierName}
                </span>
                <div className="flex min-w-[240px] flex-1">
                  <SearchBox
                    label={`Buscar producto de ${order.supplierName}`}
                    placeholder="Buscar por nombre o SKU"
                    value={query}
                    onChange={setQuery}
                  />
                </div>
              </div>
              <ListPanel className="max-h-[260px] overflow-auto group-data-maximized/dialog:max-h-[420px]">
                {candidates.length > 0 ? (
                  <ul className="divide-y divide-[#f5f1ed]">
                    {candidates.map((product) => (
                      <li
                        key={product.id}
                        className="flex items-center gap-3 px-3.5 py-2.5"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#faf9f7]">
                          <ProductImage
                            src={product.imageUrl || null}
                            name={product.name}
                            className="size-full object-contain p-1 mix-blend-multiply"
                            placeholderClassName="size-5"
                          />
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <strong className="block font-semibold">
                            {product.name}
                          </strong>
                          <small className="block text-[#907e84]">
                            {product.sku}
                          </small>
                        </span>
                        <ActionButton
                          type="button"
                          tone="secondary"
                          className="min-h-9 px-3"
                          aria-label={`Agregar ${product.name}`}
                          onClick={() =>
                            setExtras((current) =>
                              addExtra(current, product.id),
                            )
                          }
                        >
                          Agregar
                        </ActionButton>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3.5 py-4 text-center text-xs text-[#907e84]">
                    {query.trim()
                      ? 'Sin productos que coincidan'
                      : `No hay más productos de ${order.supplierName} para agregar`}
                  </p>
                )}
              </ListPanel>
              {extraLines.length > 0 && (
                <ListPanel className="overflow-auto">
                  <ListTable className="min-w-[900px]">
                    <ListHead>
                      {[
                        'Producto',
                        'Cajas',
                        'Costo por pieza',
                        'Total',
                        'Caducidad',
                        '',
                      ]}
                    </ListHead>
                    <ListBody>
                      {extraLines.map((line) => {
                        const entry = extras[line.productId]!
                        const issue = shownExtraIssues[line.productId]
                        const total = extraTotalCents(line, entry)
                        const patch = (value: Partial<typeof entry>) =>
                          setExtras((current) => ({
                            ...current,
                            [line.productId]: { ...entry, ...value },
                          }))
                        return (
                          <ListRow key={line.productId} className="align-top">
                            <ListCell>
                              <strong>{line.name}</strong>
                              <small className="block text-[#907e84]">
                                {line.sku}
                              </small>
                              {issue && (
                                <small className="block max-w-[220px] text-[#b3261e]">
                                  {issue}
                                </small>
                              )}
                            </ListCell>
                            <ListCell>
                              <FieldInput
                                inputMode="numeric"
                                aria-label={`Cajas de ${line.name} sin pedido`}
                                aria-invalid={issue ? true : undefined}
                                className={`${compact} w-[76px]`}
                                value={entry.boxes}
                                onChange={(event) =>
                                  patch({ boxes: event.target.value })
                                }
                              />
                            </ListCell>
                            <ListCell>
                              <FieldInput
                                inputMode="decimal"
                                aria-label={`Costo por pieza de ${line.name} sin pedido`}
                                aria-invalid={issue ? true : undefined}
                                className={`${compact} w-[96px]`}
                                value={
                                  entry.price ??
                                  formatTenThousandths(
                                    line.price.listPricePerPiece,
                                  )
                                }
                                onChange={(event) =>
                                  patch({ price: event.target.value })
                                }
                              />
                            </ListCell>
                            <ListCell>
                              <strong
                                aria-label={`Total de ${line.name} sin pedido`}
                              >
                                {total === null ? '—' : formatCents(total)}
                              </strong>
                            </ListCell>
                            <ListCell>
                              <ExpiryField
                                label={`${line.name} sin pedido`}
                                className={`${compact} w-[140px]`}
                                expiresOn={entry.expiresOn}
                                noExpiry={entry.noExpiry ?? false}
                                invalid={Boolean(issue)}
                                onChange={(value) => patch(value)}
                              />
                            </ListCell>
                            <ListCell>
                              <ActionButton
                                type="button"
                                className="min-h-9 px-3"
                                onClick={() =>
                                  setExtras((current) =>
                                    removeExtra(current, line.productId),
                                  )
                                }
                              >
                                Quitar
                              </ActionButton>
                            </ListCell>
                          </ListRow>
                        )
                      })}
                    </ListBody>
                  </ListTable>
                </ListPanel>
              )}
            </section>
          )}

          <div className="grid gap-2 text-sm text-[#5f4a51]">
            {(totals.changed > 0 || extrasRepriced) && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={updateCatalog}
                  onChange={(event) => setUpdateCatalog(event.target.checked)}
                />
                <span>
                  Actualizar también el costo por pieza en el catálogo para los
                  próximos pedidos.
                </span>
              </label>
            )}
          </div>

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
                            {boxCountLabel(row.owedBoxes, row.boxFactor)}
                            <small className="block text-[#907e84]">
                              {formatCents(row.owedValueCents)}
                            </small>
                          </ListCell>
                          <ListCell>
                            <FieldInput
                              inputMode="numeric"
                              aria-label={`Llegaron ${row.boxFactor < 2 ? 'piezas' : 'cajas'} de ${row.productName} (${row.originCode})`}
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
    boxFactor: line.boxFactor,
    price: {
      listPricePerPiece: line.listPricePerPiece,
      fixedDiscountPerPiece: line.fixedDiscountPerPiece,
      promotionPerPiece: line.promotionPerPiece,
    },
  }))
}

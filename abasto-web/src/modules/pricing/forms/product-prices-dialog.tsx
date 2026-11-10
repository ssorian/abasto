import { AlertTriangleIcon, HistoryIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { StatusBadge } from '#/components/status-badge'
import type { StatusTone } from '#/components/status-badge'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import { Field, TextInput } from '#/modules/catalog/forms/form-field'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import { packInfoOf } from '#/modules/inventory/lib/pack-info'
import { formatBps, formatCents, parsePesos } from '#/modules/pricing/lib/money'
import {
  pieceCostDraftOf,
  pieceCostErrors,
} from '#/modules/pricing/lib/piece-cost-draft'
import type {
  PieceCostAmounts,
  PieceCostDraft,
} from '#/modules/pricing/lib/piece-cost-draft'
import { savedSummary } from '#/modules/pricing/lib/saved-summary'
import { originLabels, pendingPrices } from '#/modules/pricing/lib/price-table'
import type {
  PriceTableRow,
  ProductGroup,
} from '#/modules/pricing/lib/price-table'
import {
  costPatchIfChanged,
  grossCostOf,
  netCostOf,
  saleCheck,
} from '#/modules/pricing/lib/product-costs'
import { formatTenThousandths } from '#/lib/utils/supplier-cost'

const originTones: Record<PriceTableRow['origin'], StatusTone> = {
  own: 'green',
  derived: 'blue',
  none: 'gray',
}

const costFields: ReadonlyArray<[keyof PieceCostDraft, string]> = [
  ['listPrice', 'Costo por pieza'],
  ['fixedDiscount', 'Descuento fijo'],
  ['promotion', 'Promoción'],
]

type ProductPricesDialogProps = {
  product: CatalogProduct
  group: ProductGroup
  warehouseName: string
  /** Manager of this warehouse or owner; everyone else only reads the sale prices. */
  canEdit: boolean
  /** Owner or any warehouse manager: the supplier cost is global and hidden from everyone else. */
  canEditCost: boolean
  /** Resolve to the server message when saving failed, or null on success. */
  onSaveCost: (patch: PieceCostAmounts) => Promise<string | null>
  onSavePrices: (
    prices: Array<{ presentationId: string; priceCents: number }>,
  ) => Promise<string | null>
  /** Absent where the price history is not reachable (order rows). */
  onHistory?: (row: PriceTableRow) => void
  onClose: () => void
}

/** Supplier cost (global) on top, standard sale prices of one warehouse below. */
export function ProductPricesDialog({
  product,
  group,
  warehouseName,
  canEdit,
  canEditCost,
  onSaveCost,
  onSavePrices,
  onHistory,
  onClose,
}: ProductPricesDialogProps) {
  const [cost, setCost] = useState(() => pieceCostDraftOf(product))
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCostErrors, setShowCostErrors] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const boxFactor = packInfoOf(product).factor
  const costErrors = pieceCostErrors(cost)
  const net = netCostOf(cost, boxFactor)
  const gross = grossCostOf(cost, boxFactor)
  const costPatch = canEditCost ? costPatchIfChanged(cost, product) : null
  const costDirty = !costPatch || !costPatch.ok || costPatch.value !== null
  const pending = canEdit
    ? Object.values(edits).filter((text) => text.trim()).length
    : 0
  const dirty = (canEditCost && costDirty) || pending > 0
  const editable = canEdit || canEditCost

  async function save() {
    setFailure(null)
    const result = canEdit
      ? pendingPrices(group.rows, edits)
      : { prices: [], errors: {} }
    setErrors(result.errors)
    setShowCostErrors(true)
    if (costPatch && !costPatch.ok) return
    if (Object.keys(result.errors).length) return
    setSaving(true)
    const costToSave = costPatch?.ok ? costPatch.value : null
    const costMessage = costToSave ? await onSaveCost(costToSave) : null
    const costSaved = Boolean(costToSave) && costMessage === null
    const pricesMessage =
      costMessage === null && result.prices.length
        ? await onSavePrices(result.prices)
        : null
    const pricesSaved = costMessage === null && result.prices.length > 0
    setSaving(false)
    const saved = savedSummary(
      costSaved,
      pricesSaved && pricesMessage === null,
      result.prices.length,
    )
    if (saved) toast.success(saved)
    const message = costMessage ?? pricesMessage
    if (message) setFailure(message)
    else onClose()
  }

  /** The price being typed when valid, else the current one. */
  function priceOf(row: PriceTableRow) {
    const typed = (edits[row.presentationId] as string | undefined)?.trim()
    if (typed) {
      const parsed = parsePesos(typed)
      if (parsed.ok) return parsed.value
    }
    return row.priceCents
  }

  return (
    <CatalogModal
      title={group.productName}
      description={
        editable
          ? 'El costo del proveedor vale para todos los almacenes; el precio de venta es el del almacén elegido.'
          : `Precios estándar en ${warehouseName}. Solo lectura: los cambia el encargado de este almacén.`
      }
      size="editor"
      onClose={onClose}
    >
      {canEditCost && (
        <section className="grid gap-3" aria-label="Costo del proveedor">
          <div>
            <h3 className="text-sm font-semibold text-[#3b2251]">
              Costo del proveedor
            </h3>
            <p className="mt-0.5 text-xs text-[#9d8c92]">
              Aplica a todos los almacenes. Hasta 4 decimales.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {costFields.map(([key, label]) => (
              <Field key={key} label={label}>
                <TextInput
                  inputMode="decimal"
                  placeholder="0.0000"
                  aria-label={label}
                  aria-invalid={showCostErrors && Boolean(costErrors[key])}
                  value={cost[key]}
                  onChange={(event) =>
                    setCost({ ...cost, [key]: event.target.value })
                  }
                />
                {showCostErrors && costErrors[key] && (
                  <span className="text-xs text-[#b42318]">
                    {costErrors[key]}
                  </span>
                )}
              </Field>
            ))}
          </div>
          <dl className="grid gap-x-4 gap-y-1 rounded-xl bg-[#faf6f1] px-3.5 py-3 text-sm sm:grid-cols-2">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-[#89747b]">Antes de descuentos por pieza</dt>
              <dd className="font-semibold text-[#5d4a52]">
                {gross ? `$${formatTenThousandths(gross.perPiece)}` : '—'}
              </dd>
            </div>
            {boxFactor > 1 && (
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[#89747b]">Antes de descuentos por caja</dt>
                <dd className="font-semibold text-[#5d4a52]">
                  {gross ? formatCents(gross.perBoxCents) : '—'}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-[#89747b]">Costo neto por pieza</dt>
              <dd className="font-bold text-[#4d2b6a]">
                {net ? `$${formatTenThousandths(net.perPiece)}` : '—'}
              </dd>
            </div>
            {boxFactor > 1 && (
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[#89747b]">Costo neto por caja</dt>
                <dd className="font-bold text-[#4d2b6a]">
                  {net ? formatCents(net.perBoxCents) : '—'}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
      <section className="grid gap-3" aria-label="Precio de venta">
        <div>
          <h3 className="text-sm font-semibold text-[#3b2251]">
            Precio de venta · {warehouseName}
          </h3>
          {canEdit && (
            <p className="mt-0.5 text-xs text-[#9d8c92]">
              Cada lote puede venderse más caro al darle entrada. Una
              presentación sin precio propio lo deriva de la principal.
            </p>
          )}
        </div>
        <ul className="divide-y divide-[#f4f1ed] rounded-xl border border-[#eee8e2]">
          {group.rows.map((row) => {
            const check =
              canEditCost && net
                ? saleCheck(row.factor, priceOf(row), net.perPiece)
                : null
            return (
              <li
                key={row.presentationId}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm text-[#3b2251]">
                    {row.presentationName}
                    {row.factor > 1 && (
                      <span className="font-normal text-[#a29096]">
                        {' '}
                        ×{row.factor}
                      </span>
                    )}
                  </strong>
                  <span className="mt-1 flex items-center gap-2 text-xs text-[#89747b]">
                    <StatusBadge tone={originTones[row.origin]}>
                      {originLabels[row.origin]}
                    </StatusBadge>
                    {row.priceCents === null
                      ? '—'
                      : formatCents(row.priceCents)}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex flex-col items-end gap-1">
                    <TextInput
                      aria-label={`Nuevo precio de ${row.presentationName}`}
                      inputMode="decimal"
                      placeholder={
                        row.priceCents === null
                          ? 'Sin precio'
                          : (row.priceCents / 100).toFixed(2)
                      }
                      className="min-h-[38px] w-[120px] py-1.5 text-right"
                      value={edits[row.presentationId] ?? ''}
                      onChange={(event) =>
                        setEdits((current) => ({
                          ...current,
                          [row.presentationId]: event.target.value,
                        }))
                      }
                      aria-invalid={Boolean(errors[row.presentationId])}
                    />
                    {errors[row.presentationId] && (
                      <span className="text-xs text-[#b42318]">
                        {errors[row.presentationId]}
                      </span>
                    )}
                  </div>
                )}
                {onHistory && (
                  <button
                    type="button"
                    aria-label={`Historial de ${row.presentationName}`}
                    className="rounded p-1.5 text-[#89747b] hover:bg-[#faf6f1]"
                    onClick={() => onHistory(row)}
                  >
                    <HistoryIcon size={16} />
                  </button>
                )}
                {check &&
                  (check.belowCost ? (
                    <p className="flex basis-full items-start gap-1.5 text-xs text-[#a08442]">
                      <AlertTriangleIcon
                        size={13}
                        className="mt-0.5 shrink-0"
                      />
                      Está por debajo del costo neto (
                      {formatCents(check.costCents)}). Puedes guardarlo.
                    </p>
                  ) : (
                    <p className="basis-full text-xs text-[#89747b]">
                      Costo neto {formatCents(check.costCents)} · margen{' '}
                      {formatBps(check.marginBps)}%
                    </p>
                  ))}
              </li>
            )
          })}
        </ul>
      </section>
      {failure && (
        <p role="alert" className="text-sm text-[#b42318]">
          {failure}
        </p>
      )}
      <div className="flex justify-end gap-2.5">
        <CatalogButton onClick={onClose}>
          {editable ? 'Cancelar' : 'Cerrar'}
        </CatalogButton>
        {editable && (
          <CatalogButton
            tone="primary"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {saving ? 'Guardando…' : 'Guardar precios'}
          </CatalogButton>
        )}
      </div>
    </CatalogModal>
  )
}

import { HistoryIcon } from 'lucide-react'
import { useState } from 'react'

import { StatusBadge } from '#/components/status-badge'
import type { StatusTone } from '#/components/status-badge'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import { TextInput } from '#/modules/catalog/forms/form-field'
import { MarginCell } from '#/modules/pricing/components/margin-cell'
import { formatCents } from '#/modules/pricing/lib/money'
import { originLabels, pendingPrices } from '#/modules/pricing/lib/price-table'
import type {
  PriceTableRow,
  ProductGroup,
} from '#/modules/pricing/lib/price-table'

const originTones: Record<PriceTableRow['origin'], StatusTone> = {
  own: 'green',
  derived: 'blue',
  none: 'gray',
}

type ProductPricesDialogProps = {
  group: ProductGroup
  warehouseName: string
  /** Manager of this warehouse or owner; everyone else only reads. */
  canEdit: boolean
  /** Null hides the target margin (owner only). */
  marginBps: number | null
  onSavePrices: (
    prices: Array<{ presentationId: string; priceCents: number }>,
  ) => Promise<boolean>
  onSaveMargin: (marginBps: number) => Promise<boolean>
  onHistory: (row: PriceTableRow) => void
  onClose: () => void
}

/** Prices of one product's presentations in one warehouse. */
export function ProductPricesDialog({
  group,
  warehouseName,
  canEdit,
  marginBps,
  onSavePrices,
  onSaveMargin,
  onHistory,
  onClose,
}: ProductPricesDialogProps) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const pending = Object.values(edits).filter((text) => text.trim()).length

  async function save() {
    const result = pendingPrices(group.rows, edits)
    setErrors(result.errors)
    if (Object.keys(result.errors).length) return
    if (!result.prices.length) return onClose()
    setSaving(true)
    const saved = await onSavePrices(result.prices)
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <CatalogModal
      title={group.productName}
      description={
        canEdit
          ? `Precios en ${warehouseName}. Una presentación sin precio propio lo deriva de la principal.`
          : `Precios en ${warehouseName}. Solo lectura: los cambia el encargado de este almacén.`
      }
      size="editor"
      onClose={onClose}
    >
      <ul className="divide-y divide-[#edf0f4] rounded-xl border border-[#e2e7ee]">
        {group.rows.map((row) => (
          <li
            key={row.presentationId}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#223751]">
                {row.presentationName}
                {row.factor > 1 && (
                  <span className="font-normal text-[#8a97a8]">
                    {' '}
                    ×{row.factor}
                  </span>
                )}
              </strong>
              <span className="mt-1 flex items-center gap-2 text-xs text-[#6d7d90]">
                <StatusBadge tone={originTones[row.origin]}>
                  {originLabels[row.origin]}
                </StatusBadge>
                {row.priceCents === null ? '—' : formatCents(row.priceCents)}
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
            <button
              type="button"
              aria-label={`Historial de ${row.presentationName}`}
              className="rounded p-1.5 text-[#6d7d90] hover:bg-[#f1f5fa]"
              onClick={() => onHistory(row)}
            >
              <HistoryIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
      {marginBps !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#32455e]">
          <span>
            Margen objetivo
            <span className="block text-xs text-[#8a97a8]">
              Sugiere el precio al registrar una compra.
            </span>
          </span>
          <MarginCell
            key={marginBps}
            marginBps={marginBps}
            onSave={onSaveMargin}
          />
        </div>
      )}
      <div className="flex justify-end gap-2.5">
        <CatalogButton onClick={onClose}>
          {canEdit ? 'Cancelar' : 'Cerrar'}
        </CatalogButton>
        {canEdit && (
          <CatalogButton
            tone="primary"
            disabled={!pending || saving}
            onClick={() => void save()}
          >
            {saving
              ? 'Guardando…'
              : pending > 1
                ? `Guardar ${pending} precios`
                : 'Guardar precio'}
          </CatalogButton>
        )}
      </div>
    </CatalogModal>
  )
}

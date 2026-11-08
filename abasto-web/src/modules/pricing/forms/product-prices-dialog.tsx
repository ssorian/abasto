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
          ? `Precios estándar en ${warehouseName}; cada lote puede venderse más caro al darle entrada. Una presentación sin precio propio lo deriva de la principal.`
          : `Precios estándar en ${warehouseName}. Solo lectura: los cambia el encargado de este almacén.`
      }
      size="editor"
      onClose={onClose}
    >
      <ul className="divide-y divide-[#f4f1ed] rounded-xl border border-[#eee8e2]">
        {group.rows.map((row) => (
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
              className="rounded p-1.5 text-[#89747b] hover:bg-[#faf6f1]"
              onClick={() => onHistory(row)}
            >
              <HistoryIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
      {marginBps !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#513f45]">
          <span>
            Margen objetivo
            <span className="block text-xs text-[#a29096]">
              Referencia de margen para el precio estándar.
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

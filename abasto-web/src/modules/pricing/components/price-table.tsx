import { HistoryIcon } from 'lucide-react'

import { StatusBadge } from '#/components/status-badge'
import type { StatusTone } from '#/components/status-badge'
import { TextInput } from '#/modules/catalog/forms/form-field'
import { MarginCell } from '#/modules/pricing/components/margin-cell'
import { formatCents } from '#/modules/pricing/lib/money'
import { originLabels } from '#/modules/pricing/lib/price-table'
import type {
  PriceTableRow,
  ProductGroup,
} from '#/modules/pricing/lib/price-table'

const originTones: Record<PriceTableRow['origin'], StatusTone> = {
  own: 'green',
  derived: 'blue',
  none: 'gray',
}

type PriceTableProps = {
  groups: Array<ProductGroup>
  /** Manager of this warehouse or owner; everyone else reads. */
  canEdit: boolean
  edits: Record<string, string>
  errors: Record<string, string>
  onEdit: (presentationId: string, text: string) => void
  onHistory: (row: PriceTableRow) => void
  /** Null hides the margin column (owner only). */
  margins: Record<string, number> | null
  onSaveMargin: (productId: string, marginBps: number) => Promise<boolean>
}

const head = 'px-3 py-2.5 text-left text-xs font-semibold text-[#6d7d90]'

export function PriceTable({
  groups,
  canEdit,
  edits,
  errors,
  onEdit,
  onHistory,
  margins,
  onSaveMargin,
}: PriceTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#e2e7ee] bg-white">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="bg-[#f7f9fb]">
          <tr>
            <th className={head}>Producto</th>
            <th className={head}>Presentación</th>
            <th className={`${head} text-right`}>Precio</th>
            <th className={head}>Origen</th>
            {margins && (
              <th className={`${head} text-right`}>Margen objetivo</th>
            )}
            <th className={head}>
              <span className="sr-only">Historial</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) =>
            group.rows.map((row, index) => (
              <tr
                key={row.presentationId}
                className="border-t border-[#edf0f4]"
              >
                <td className="px-3 py-2.5 align-middle">
                  {index === 0 && (
                    <>
                      <strong className="block text-[#223751]">
                        {group.productName}
                      </strong>
                      <span className="text-xs text-[#8a97a8]">
                        {group.sku} · {group.category}
                      </span>
                    </>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[#32455e]">
                  {row.presentationName}
                  {row.factor > 1 && (
                    <span className="text-xs text-[#8a97a8]">
                      {' '}
                      ×{row.factor}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {canEdit ? (
                    <div className="flex flex-col items-end gap-1">
                      <TextInput
                        aria-label={`Precio de ${group.productName} ${row.presentationName}`}
                        inputMode="decimal"
                        placeholder={
                          row.priceCents === null
                            ? 'Sin precio'
                            : (row.priceCents / 100).toFixed(2)
                        }
                        className="w-[110px] min-h-[36px] py-1.5 text-right"
                        value={edits[row.presentationId] ?? ''}
                        onChange={(event) =>
                          onEdit(row.presentationId, event.target.value)
                        }
                        aria-invalid={Boolean(errors[row.presentationId])}
                      />
                      <span className="text-xs text-[#6d7d90]">
                        {row.priceCents === null
                          ? '—'
                          : formatCents(row.priceCents)}
                      </span>
                      {errors[row.presentationId] && (
                        <span className="text-xs text-[#b42318]">
                          {errors[row.presentationId]}
                        </span>
                      )}
                    </div>
                  ) : row.priceCents === null ? (
                    '—'
                  ) : (
                    formatCents(row.priceCents)
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={originTones[row.origin]}>
                    {originLabels[row.origin]}
                  </StatusBadge>
                </td>
                {margins && (
                  <td className="px-3 py-2.5 text-right">
                    {index === 0 && (
                      <MarginCell
                        key={`${group.productId}:${margins[group.productId] ?? 0}`}
                        marginBps={margins[group.productId] ?? 0}
                        onSave={(bps) => onSaveMargin(group.productId, bps)}
                      />
                    )}
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-label={`Historial de ${group.productName} ${row.presentationName}`}
                    className="rounded p-1.5 text-[#6d7d90] hover:bg-[#f1f5fa]"
                    onClick={() => onHistory(row)}
                  >
                    <HistoryIcon size={16} />
                  </button>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  )
}

import { StatusBadge } from '#/components/status-badge'
import { ProductImage } from '#/components/product-image'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { HeldBreakdown } from '#/modules/inventory/components/held-breakdown'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import { dateLabel } from '#/modules/inventory/lib/format'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import {
  expiryState,
  productStatus,
} from '#/modules/inventory/lib/stock-metrics'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type ProductCardsProps = {
  rows: ReadonlyArray<ProductStock>
  packs: ReadonlyMap<string, PackInfo>
  today: string
  canManage: boolean
  onLots: (row: ProductStock) => void
  onMinimum: (productId: string) => void
}

/** Phone version of the Productos list: one block per product (the table shows from md up). */
export function ProductCards({
  rows,
  packs,
  today,
  canManage,
  onLots,
  onMinimum,
}: ProductCardsProps) {
  return (
    <ul className="flex flex-col gap-2.5 md:hidden">
      {rows.map((row) => {
        const pack = packs.get(row.productId) ?? {
          packName: row.unit,
          factor: 1,
          unit: row.unit,
        }
        const nextExpiry = row.lots.find((lot) => lot.expiresOn)
        const state = expiryState(nextExpiry?.expiresOn ?? null, today)
        return (
          <li
            key={row.productId}
            className="rounded-xl border border-[#eee7e0] bg-white p-3.5 text-sm text-[#785e67]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#faf9f7]">
                <ProductImage
                  src={row.imageUrl}
                  name={row.name}
                  className="size-full object-contain p-1 mix-blend-multiply"
                  placeholderClassName="size-5"
                />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block font-semibold">{row.name}</strong>
                <small className="block text-xs text-[#907e84]">
                  {row.sku}
                </small>
              </span>
              <StockBadge value={productStatus(row)} dot />
            </div>
            <div className="mt-3">
              <strong className="font-semibold">
                {formatQuantity(row.onHand, pack)}
              </strong>
              {row.minimum > 0 && (
                <small className="ml-2 text-xs text-[#907e84]">
                  Mínimo {formatQuantity(row.minimum, pack)}
                </small>
              )}
              <HeldBreakdown row={row} pack={pack} />
              {nextExpiry?.expiresOn && (
                <small className="mt-1 block text-xs text-[#907e84]">
                  Caduca {dateLabel(nextExpiry.expiresOn)}
                  {state === 'expired' && (
                    <StatusBadge tone="red" className="ml-2">
                      Vencido
                    </StatusBadge>
                  )}
                  {state === 'soon' && (
                    <StatusBadge tone="amber" className="ml-2">
                      Por vencer
                    </StatusBadge>
                  )}
                </small>
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <ActionButton
                className="min-h-9 px-3"
                onClick={() => onLots(row)}
              >
                Lotes
              </ActionButton>
              {canManage && (
                <ActionButton
                  className="min-h-9 px-3"
                  onClick={() => onMinimum(row.productId)}
                >
                  Mínimo
                </ActionButton>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

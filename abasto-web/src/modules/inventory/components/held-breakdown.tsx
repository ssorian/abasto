import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type HeldBreakdownProps = {
  row: Pick<ProductStock, 'inRoute' | 'reserved' | 'available'>
  pack: PackInfo
}

/**
 * Explains why on-hand stock is not all sellable: units out with riders and
 * units held by open orders, plus what is left free. Hidden when nothing is held.
 */
export function HeldBreakdown({ row, pack }: HeldBreakdownProps) {
  if (row.inRoute <= 0 && row.reserved <= 0) return null
  const parts = [
    row.inRoute > 0 && `En ruta ${formatQuantity(row.inRoute, pack)}`,
    row.reserved > 0 && `Apartado ${formatQuantity(row.reserved, pack)}`,
    `Libre ${formatQuantity(Math.max(row.available, 0), pack)}`,
  ].filter(Boolean)
  return (
    <small className="mt-0.5 block font-semibold text-[#8a5a00]">
      {parts.join(' · ')}
    </small>
  )
}

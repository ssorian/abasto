import { formatPieceCost } from '#/modules/pricing/lib/product-costs'
import { formatCents } from '#/modules/pricing/lib/money'
import type { ProductGroup } from '#/modules/pricing/lib/price-table'

type CardPricesProps = {
  /** Undefined when the product has no presentations in the price list. */
  group: ProductGroup | undefined
  warehouseName: string
  /** Net cost per piece in ten-thousandths; omitted for anyone who may not see costs. */
  netCostPerPiece?: number
}

/** Current price of each presentation of one product in the selected warehouse. */
export function CardPrices({
  group,
  warehouseName,
  netCostPerPiece,
}: CardPricesProps) {
  return (
    <div className="mb-3 border-b border-[#f4f1ed] pb-[15px] text-xs text-[#a29096] md:text-sm">
      {netCostPerPiece !== undefined && (
        <p className="mb-3 flex items-baseline justify-between gap-2">
          <span>Costo por pieza</span>
          <strong className="font-semibold text-[#513f45]">
            {formatPieceCost(netCostPerPiece)}
          </strong>
        </p>
      )}
      <span>Precio estándar en {warehouseName}</span>
      {group?.rows.length ? (
        <ul className="mt-[7px] space-y-1">
          {group.rows.map((row) => (
            <li
              key={row.presentationId}
              className="flex items-baseline justify-between gap-2"
            >
              <span className="min-w-0 truncate text-[#513f45]">
                {row.presentationName}
              </span>
              <strong
                className={
                  row.priceCents === null
                    ? 'font-normal text-[#ae9fa4]'
                    : 'text-base font-bold text-[#4d2b6a]'
                }
              >
                {row.priceCents === null
                  ? 'Sin precio'
                  : formatCents(row.priceCents)}
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-[7px] text-[#ae9fa4]">Sin presentaciones activas.</p>
      )}
    </div>
  )
}

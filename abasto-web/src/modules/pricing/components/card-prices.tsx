import { TagIcon } from 'lucide-react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { formatCents } from '#/modules/pricing/lib/money'
import type { ProductGroup } from '#/modules/pricing/lib/price-table'

type CardPricesProps = {
  /** Undefined when the product has no presentations in the price list. */
  group: ProductGroup | undefined
  warehouseName: string
  /** Manager of this warehouse or owner; everyone else only reads. */
  canEdit: boolean
  onOpen: () => void
}

/** Current price of each presentation of one product in the selected warehouse. */
export function CardPrices({
  group,
  warehouseName,
  canEdit,
  onOpen,
}: CardPricesProps) {
  return (
    <div className="mb-3 border-b border-[#f4f1ed] pb-[15px] text-xs text-[#a29096] md:text-sm">
      <span>Precio en {warehouseName}</span>
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
      {group?.rows.length ? (
        <CatalogButton className="mt-3 w-full" onClick={onOpen}>
          <TagIcon className="size-4" />
          {canEdit ? 'Cambiar precios' : 'Ver precios'}
        </CatalogButton>
      ) : null}
    </div>
  )
}

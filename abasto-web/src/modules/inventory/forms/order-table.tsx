import { AlertTriangleIcon, PencilIcon } from 'lucide-react'

import { formatTenThousandths } from '#/lib/utils/supplier-cost'
import { FieldInput } from '#/modules/inventory/components/form-controls'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { formatCents } from '#/modules/inventory/lib/cents'
import { packInfoOf } from '#/modules/inventory/lib/pack-info'
import {
  NET_ABOVE_LIST_PRICE_MESSAGE,
  rowOf,
  rowWarnings,
} from '#/modules/inventory/lib/supplier-order-draft'
import type { OrderDraft } from '#/modules/inventory/lib/supplier-order-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type OrderTableProps = {
  /** Products of the chosen supplier, already filtered by the search. */
  products: ReadonlyArray<CatalogProduct>
  boxes: OrderDraft['boxes']
  /** Standard price per box by product id; only drives the warning, it is never shown. */
  standardByProductId: Readonly<Partial<Record<string, number>>>
  onBoxes: (productId: string, boxes: string) => void
  /** Opens the catalog editor of a product; absent for users who cannot edit products. */
  onEdit?: (productId: string) => void
}

const compact = 'min-h-[38px] px-2 py-1.5'

/** How a product's box reads, e.g. "Caja · 12 piezas". */
function boxLabel(product: CatalogProduct) {
  const { packName, factor, unit } = packInfoOf(product)
  return factor === 1 ? packName : `${packName} · ${factor} ${unit}`
}

/** One row per supplier product: only the boxes are typed; the rest comes from the catalog. */
export function OrderTable({
  products,
  boxes,
  standardByProductId,
  onBoxes,
  onEdit,
}: OrderTableProps) {
  if (!products.length) {
    return (
      <p className="py-6 text-center text-sm text-[#907e84]">
        No hay productos que coincidan.
      </p>
    )
  }
  return (
    <ListPanel className="max-h-[420px] overflow-auto">
      <ListTable className="min-w-[1080px]">
        <ListHead>
          {[
            'Producto',
            'Cajas',
            'Precio x pieza',
            'Desc. fijo',
            'Promo',
            'Costo neto x caja',
            'Costo total',
          ]}
        </ListHead>
        <ListBody>
          {products.map((product) => {
            const standard = standardByProductId[product.id]
            const row = rowOf(product, boxes[product.id])
            const warnings = rowWarnings(row, standard)
            return (
              <ListRow key={product.id} className="align-top">
                <ListCell>
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <strong>{product.name}</strong>
                      <small className="block text-[#907e84]">
                        {boxLabel(product)}
                      </small>
                    </span>
                    {onEdit && (
                      <button
                        type="button"
                        aria-label={`Editar ${product.name}`}
                        title="Editar producto"
                        className="shrink-0 rounded-md p-1.5 text-[#907e84] hover:bg-[#f4eef0] hover:text-[#5f4a51]"
                        onClick={() => onEdit(product.id)}
                      >
                        <PencilIcon size={15} />
                      </button>
                    )}
                  </span>
                  {warnings.map((warning) => (
                    <small
                      key={warning}
                      className="flex max-w-[360px] items-start gap-1.5 text-[#a08442]"
                    >
                      <AlertTriangleIcon
                        size={13}
                        className="mt-0.5 shrink-0"
                      />
                      {warning}
                    </small>
                  ))}
                </ListCell>
                <ListCell>
                  <FieldInput
                    inputMode="numeric"
                    aria-label={`Cajas de ${product.name}`}
                    className={`${compact} w-[76px]`}
                    placeholder="0"
                    value={boxes[product.id] ?? ''}
                    onChange={(event) =>
                      onBoxes(product.id, event.target.value)
                    }
                  />
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatTenThousandths(row.listPrice)}
                  {row.exceedsList && (
                    <small className="mt-1 block max-w-[200px] whitespace-normal text-[#b3414b]">
                      {NET_ABOVE_LIST_PRICE_MESSAGE}
                    </small>
                  )}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatTenThousandths(product.fixedDiscountPerPiece)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatTenThousandths(product.promotionPerPiece)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatCents(row.netPerBoxCents)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatCents(row.netLineCents)}
                </ListCell>
              </ListRow>
            )
          })}
        </ListBody>
      </ListTable>
    </ListPanel>
  )
}

import { AlertTriangleIcon } from 'lucide-react'

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
import { formatTenThousandths } from '#/modules/inventory/lib/supplier-cost'
import {
  rowOf,
  rowWarnings,
} from '#/modules/inventory/lib/supplier-order-draft'
import type { OrderDraft } from '#/modules/inventory/lib/supplier-order-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type OrderTableProps = {
  /** Products of the chosen supplier, already filtered by the search. */
  products: ReadonlyArray<CatalogProduct>
  boxes: OrderDraft['boxes']
  prices: OrderDraft['prices']
  /** Standard price per box by product id for the receiving warehouse. */
  standardByProductId: Readonly<Partial<Record<string, number>>>
  onBoxes: (productId: string, boxes: string) => void
  onPrice: (productId: string, price: string) => void
}

const compact = 'min-h-[38px] px-2 py-1.5'

/** How a product's box reads, e.g. "Caja · 12 piezas". */
function boxLabel(product: CatalogProduct) {
  const { packName, factor, unit } = packInfoOf(product)
  return factor === 1 ? packName : `${packName} · ${factor} ${unit}`
}

/** One row per supplier product: boxes and list price typed; discounts, cost and sale price read-only. */
export function OrderTable({
  products,
  boxes,
  prices,
  standardByProductId,
  onBoxes,
  onPrice,
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
      <ListTable className="min-w-[1040px]">
        <ListHead>
          {[
            'Producto',
            'Cajas',
            'Precio x pieza',
            'Desc. fijo x pieza',
            'Promo x pieza',
            'Costo neto x caja',
            'Total',
            'Precio de salida',
          ]}
        </ListHead>
        <ListBody>
          {products.map((product) => {
            const standard = standardByProductId[product.id]
            const row = rowOf(product, boxes[product.id], prices[product.id])
            const warnings = rowWarnings(row, standard)
            return (
              <ListRow key={product.id} className="align-top">
                <ListCell>
                  <strong>{product.name}</strong>
                  <small className="block text-[#907e84]">
                    {boxLabel(product)}
                  </small>
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
                <ListCell>
                  <FieldInput
                    inputMode="decimal"
                    aria-label={`Precio por pieza de ${product.name}`}
                    className={`${compact} w-[100px]`}
                    placeholder="0.0000"
                    value={prices[product.id] ?? ''}
                    onChange={(event) =>
                      onPrice(product.id, event.target.value)
                    }
                  />
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatTenThousandths(product.fixedDiscountPerPiece)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatTenThousandths(product.promotionPerPiece)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatCents(row.costPerBoxCents)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatCents(row.totalCents)}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {standard === undefined ? '—' : formatCents(standard)}
                </ListCell>
              </ListRow>
            )
          })}
        </ListBody>
      </ListTable>
    </ListPanel>
  )
}

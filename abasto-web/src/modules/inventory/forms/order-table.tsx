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
import {
  costPerBoxOf,
  rowWarnings,
} from '#/modules/inventory/lib/supplier-order-draft'
import type { OrderDraft } from '#/modules/inventory/lib/supplier-order-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type OrderTableProps = {
  /** Products of the chosen supplier, already filtered by the search. */
  products: ReadonlyArray<CatalogProduct>
  boxes: OrderDraft['boxes']
  /** Standard price per box by product id for the receiving warehouse. */
  standardByProductId: Readonly<Partial<Record<string, number>>>
  onBoxes: (productId: string, boxes: string) => void
}

const compact = 'min-h-[38px] px-2 py-1.5'

/** How a product's box reads, e.g. "Caja · 12 piezas". */
function boxLabel(product: CatalogProduct) {
  const { packName, factor, unit } = packInfoOf(product)
  return factor === 1 ? packName : `${packName} · ${factor} ${unit}`
}

/** One row per supplier product: boxes typed, cost and price read-only, warnings. */
export function OrderTable({
  products,
  boxes,
  standardByProductId,
  onBoxes,
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
      <ListTable className="min-w-[760px]">
        <ListHead>
          {['Producto', 'Cajas', 'Costo por caja', 'Precio de salida por caja']}
        </ListHead>
        <ListBody>
          {products.map((product) => {
            const standard = standardByProductId[product.id]
            const warnings = rowWarnings(product, standard)
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
                <ListCell className="whitespace-nowrap">
                  {formatCents(costPerBoxOf(product))}
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

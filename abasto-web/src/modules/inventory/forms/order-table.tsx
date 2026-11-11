import { useEffect } from 'react'
import { AlertTriangleIcon, TagIcon } from 'lucide-react'

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
import { digitsOnly } from '#/modules/inventory/lib/box-count'
import { formatCents } from '#/modules/inventory/lib/cents'
import {
  belowMinimumLabel,
  stockLabel,
} from '#/modules/inventory/lib/order-rows'
import type { OrderStockByProduct } from '#/modules/inventory/lib/order-rows'
import { packInfoOf } from '#/modules/inventory/lib/pack-info'
import {
  NET_ABOVE_LIST_PRICE_MESSAGE,
  boxFactorOf,
  rowOf,
  rowWarnings,
  standardPriceOf,
  unitCostOf,
} from '#/modules/inventory/lib/supplier-order-draft'
import type { OrderDraft } from '#/modules/inventory/lib/supplier-order-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type OrderTableProps = {
  /** Products of the chosen supplier, already filtered and sorted. */
  products: ReadonlyArray<CatalogProduct>
  boxes: OrderDraft['boxes']
  /** Standard price per box by product id; undefined while loading. It only drives the warnings. */
  standardByProductId: Readonly<Partial<Record<string, number>>> | undefined
  /** Stock and minimum of the receiving warehouse; undefined while loading. */
  stockByProductId: OrderStockByProduct | undefined
  onBoxes: (productId: string, boxes: string) => void
  /** Opens the prices dialog (cost and sale prices) of a product; absent for users who cannot edit products. */
  onEdit?: (productId: string) => void
  /** Row the last save failed on: highlighted, scrolled into view and its boxes focused on every new `request`. */
  failed?: { productId: string; request: number }
}

const compact = 'min-h-[38px] px-2 py-1.5'

/** How a product's box reads, e.g. "Caja · 12 piezas". */
function boxLabel(product: CatalogProduct) {
  const { packName, factor, unit } = packInfoOf(product)
  return factor === 1 ? packName : `${packName} · ${factor} ${unit}`
}

/** SKU, then the supplier's own code when the product has one. */
const codesOf = (product: CatalogProduct) =>
  product.supplierCode
    ? `${product.sku} · ${product.supplierCode}`
    : product.sku

/** One row per supplier product: only the boxes are typed; the rest comes from the catalog. */
export function OrderTable({
  products,
  boxes,
  standardByProductId,
  stockByProductId,
  onBoxes,
  onEdit,
  failed,
}: OrderTableProps) {
  useEffect(() => {
    if (!failed) return
    const input = document.querySelector<HTMLInputElement>(
      `[data-boxes-for="${CSS.escape(failed.productId)}"]`,
    )
    input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    input?.focus({ preventScroll: true })
  }, [failed?.productId, failed?.request])
  if (!products.length) {
    return (
      <p className="py-6 text-center text-sm text-[#907e84]">
        No hay productos que coincidan.
      </p>
    )
  }
  return (
    <ListPanel className="max-h-[420px] overflow-auto group-data-maximized/dialog:max-h-none">
      <ListTable className="min-w-[860px]">
        <ListHead>
          {[
            'Producto',
            'Existencia',
            'Cantidad',
            'Costo x caja o pieza',
            'Total',
          ]}
        </ListHead>
        <ListBody>
          {products.map((product) => {
            const factor = boxFactorOf(product)
            const row = rowOf(product, boxes[product.id])
            const unit = unitCostOf(product)
            const warnings = rowWarnings(
              { ...row, netPerBoxCents: unit.netPerBoxCents },
              standardPriceOf(standardByProductId, product.id),
            )
            const stock = stockByProductId?.[product.id]
            const lowLabel = belowMinimumLabel(stock, factor)
            return (
              <ListRow
                key={product.id}
                className={`align-top ${
                  failed?.productId === product.id
                    ? 'bg-[#fbecee] ring-2 ring-[#b3414b] ring-inset'
                    : ''
                }`}
              >
                <ListCell>
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <strong className="block max-w-[340px] whitespace-normal">
                        {product.name}
                      </strong>
                      <small className="block text-[#907e84]">
                        {boxLabel(product)}
                      </small>
                      <small className="block text-[#907e84]">
                        {codesOf(product)}
                      </small>
                    </span>
                    {onEdit && (
                      <button
                        type="button"
                        aria-label={`Editar precios de ${product.name}`}
                        title="Precios"
                        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#785e67] hover:bg-[#f4eef0] hover:text-[#5f4a51]"
                        onClick={() => onEdit(product.id)}
                      >
                        <TagIcon size={14} />
                        Precios
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
                <ListCell className="whitespace-nowrap">
                  {stockByProductId ? (
                    <>
                      {stockLabel(stock?.available ?? 0, factor)}
                      {lowLabel && (
                        <small className="mt-1 block font-semibold text-[#b3414b]">
                          {lowLabel}
                        </small>
                      )}
                    </>
                  ) : (
                    <span aria-label="Cargando existencias">—</span>
                  )}
                </ListCell>
                <ListCell>
                  <FieldInput
                    inputMode="numeric"
                    data-boxes-for={product.id}
                    aria-invalid={failed?.productId === product.id}
                    aria-label={`${factor < 2 ? 'Piezas' : 'Cajas'} de ${product.name}`}
                    className={`${compact} w-[76px]`}
                    placeholder="0"
                    value={boxes[product.id] ?? ''}
                    onChange={(event) =>
                      onBoxes(product.id, digitsOnly(event.target.value))
                    }
                  />
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatCents(unit.netPerBoxCents)}
                  <small className="block text-[#907e84]">
                    {formatTenThousandths(unit.netPerPiece)} por pieza
                  </small>
                  {row.exceedsList && (
                    <small className="mt-1 block max-w-[200px] whitespace-normal text-[#b3414b]">
                      {NET_ABOVE_LIST_PRICE_MESSAGE}
                    </small>
                  )}
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {formatCents(row.netLineCents)}
                  <small className="block text-[#907e84]">
                    {row.boxes * factor} pz
                  </small>
                </ListCell>
              </ListRow>
            )
          })}
        </ListBody>
      </ListTable>
    </ListPanel>
  )
}

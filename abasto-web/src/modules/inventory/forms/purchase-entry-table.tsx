import { FieldInput } from '#/modules/inventory/components/form-controls'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { formatCents, parsePesosToCents } from '#/modules/inventory/lib/cents'
import {
  boxOf,
  costPerBoxCents,
  emptyRow,
  salePriceError,
  salePriceText,
} from '#/modules/inventory/lib/purchase-draft'
import type { PurchaseEntryRow } from '#/modules/inventory/lib/purchase-draft'
import { quantityPresentations } from '#/modules/inventory/lib/pack-info'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type PurchaseEntryTableProps = {
  products: ReadonlyArray<CatalogProduct>
  rows: Partial<Record<string, PurchaseEntryRow>>
  /** Standard price per box by product id for the receiving warehouse. */
  standardByProductId: Readonly<Record<string, number>>
  onChange: (productId: string, patch: Partial<PurchaseEntryRow>) => void
}

const compact = 'min-h-[38px] px-2 py-1.5'

/** How a product's box reads, e.g. "Caja · 12 piezas". */
function boxLabel(product: CatalogProduct) {
  const box = boxOf(quantityPresentations(product))
  if (!box) return product.unit
  return box.factor === 1
    ? box.name
    : `${box.name} · ${box.factor} ${product.unit}`
}

/** One row per product: boxes, whole-lot cost, cost per box and sale price per box. */
export function PurchaseEntryTable({
  products,
  rows,
  standardByProductId,
  onChange,
}: PurchaseEntryTableProps) {
  if (!products.length) {
    return (
      <p className="py-6 text-center text-sm text-[#907e84]">
        No hay productos que coincidan con la búsqueda.
      </p>
    )
  }
  return (
    <ListPanel className="max-h-[420px] overflow-auto">
      <ListTable className="min-w-[860px]">
        <ListHead>
          {[
            'Producto',
            'Cajas',
            'Costo del lote ($)',
            'Costo por caja',
            'Precio de salida por caja ($)',
            'Lote',
            'Caducidad',
          ]}
        </ListHead>
        <ListBody>
          {products.map((product) => {
            const row = rows[product.id] ?? emptyRow()
            const perBox = costPerBoxCents(row)
            const salePrice = salePriceText(
              row,
              standardByProductId[product.id] ?? null,
            )
            const parsedSale = salePrice ? parsePesosToCents(salePrice) : null
            const error = salePriceError(
              row,
              parsedSale?.ok ? parsedSale.value : null,
            )
            return (
              <ListRow key={product.id} className="align-top">
                <ListCell>
                  <strong>{product.name}</strong>
                  <small className="block text-[#907e84]">
                    {boxLabel(product)}
                  </small>
                </ListCell>
                <ListCell>
                  <FieldInput
                    inputMode="numeric"
                    aria-label={`Cajas de ${product.name}`}
                    className={`${compact} w-[76px]`}
                    placeholder="0"
                    value={row.boxes}
                    onChange={(event) =>
                      onChange(product.id, { boxes: event.target.value })
                    }
                  />
                </ListCell>
                <ListCell>
                  <FieldInput
                    inputMode="decimal"
                    aria-label={`Costo del lote de ${product.name}`}
                    className={`${compact} w-[110px]`}
                    placeholder="0.00"
                    value={row.cost}
                    onChange={(event) =>
                      onChange(product.id, { cost: event.target.value })
                    }
                  />
                </ListCell>
                <ListCell className="whitespace-nowrap">
                  {perBox === null ? '—' : formatCents(Math.round(perBox))}
                </ListCell>
                <ListCell>
                  <FieldInput
                    inputMode="decimal"
                    aria-label={`Precio de salida por caja de ${product.name}`}
                    aria-invalid={error ? true : undefined}
                    className={`${compact} w-[120px]`}
                    placeholder="0.00"
                    value={salePrice}
                    onChange={(event) =>
                      onChange(product.id, { salePrice: event.target.value })
                    }
                  />
                  {error && (
                    <small className="block max-w-[200px] text-[#b3261e]">
                      {error}
                    </small>
                  )}
                </ListCell>
                <ListCell>
                  <FieldInput
                    aria-label={`Lote de ${product.name}`}
                    className={`${compact} w-[100px]`}
                    value={row.lotCode}
                    onChange={(event) =>
                      onChange(product.id, { lotCode: event.target.value })
                    }
                  />
                </ListCell>
                <ListCell>
                  <FieldInput
                    type="date"
                    aria-label={`Caducidad de ${product.name}`}
                    className={`${compact} w-[140px]`}
                    value={row.expiresOn}
                    onChange={(event) =>
                      onChange(product.id, { expiresOn: event.target.value })
                    }
                  />
                </ListCell>
              </ListRow>
            )
          })}
        </ListBody>
      </ListTable>
    </ListPanel>
  )
}

import { demoStock } from '#/shared/demo/inventory'
import { demoProducts } from '#/shared/demo/products'

import type { WarehouseName } from '#/shared/demo/types'
import type { ImportReferenceProduct } from '#/modules/product-import/lib/import-types'

export const defaultCategories = ['Bebidas', 'Abarrotes', 'Botanas', 'Lácteos']
export const defaultBaseUnits = ['piezas', 'cajas', 'bultos', 'paquetes']

/** Reference products built from the shared demo seeds. */
export const defaultReferenceProducts: ReadonlyArray<ImportReferenceProduct> =
  demoProducts.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.baseUnit,
    barcodes: [
      product.barcode,
      ...product.presentations.map((presentation) => presentation.barcode),
    ].filter(Boolean),
    presentations: product.presentations.map(
      ({ id, name, factor, active }) => ({
        id,
        name,
        factor,
        active,
      }),
    ),
  }))

/** Seed-based history check: a warehouse that ever received the product has history. */
export function defaultHasStockHistory(sku: string, warehouse: WarehouseName) {
  const product = demoProducts.find(
    (item) => item.sku.toLowerCase() === sku.toLowerCase(),
  )
  const stock = demoStock.find(
    (entry) => entry.productId === product?.id && entry.warehouse === warehouse,
  )
  return !!stock && (stock.received || stock.lots.length > 0)
}

import { inventoryProducts } from '#/modules/inventory/lib/catalog'
import { normalize } from '#/modules/inventory/lib/format'
import {
  available,
  blockedQuantity,
  lotStatus,
  stockFor,
  stockStatus,
} from '#/modules/inventory/lib/stock'

import type {
  InventoryProduct,
  InventoryState,
  Movement,
  StockView,
  WarehouseScope,
} from '#/modules/inventory/types/inventory'

export const statusFilters = [
  'Todos',
  'Stock bajo',
  'Agotado',
  'Reservado',
  'Por vencer',
  'Vencidos',
  'Bloqueado',
  'Sin inventario',
] as const
export type StatusFilter = (typeof statusFilters)[number]

export const sortOptions = ['Nombre', 'Menor stock', 'Mayor stock'] as const
export type ProductSort = (typeof sortOptions)[number]

export type ProductRow = { product: InventoryProduct; stock: StockView }

/** Name, brand, SKU or barcode, ignoring case and accents. */
export const matchesProduct = (product: InventoryProduct, query: string) =>
  normalize(
    `${product.name} ${product.brand} ${product.sku} ${product.barcode}`,
  ).includes(normalize(query))

export function productRows(
  state: InventoryState,
  warehouse: WarehouseScope,
): Array<ProductRow> {
  return inventoryProducts.map((product) => ({
    product,
    stock: stockFor(state, product.id, warehouse),
  }))
}

function matchesFilter(stock: StockView, filter: StatusFilter) {
  if (filter === 'Todos') return true
  if (filter === 'Por vencer' || filter === 'Vencidos') {
    const wanted = filter === 'Vencidos' ? 'Vencido' : 'Por vencer'
    return stock.lots.some((lot) => lotStatus(lot) === wanted)
  }
  if (filter === 'Bloqueado') return blockedQuantity(stock) > 0
  return stockStatus(stock) === filter
}

export function filterProducts(
  rows: ReadonlyArray<ProductRow>,
  query: string,
  category: string,
  filter: StatusFilter,
  sort: ProductSort,
) {
  return rows
    .filter(
      ({ product, stock }) =>
        matchesProduct(product, query) &&
        (category === 'Todas' || product.category === category) &&
        matchesFilter(stock, filter),
    )
    .sort((a, b) => {
      if (sort === 'Menor stock') return available(a.stock) - available(b.stock)
      if (sort === 'Mayor stock') return available(b.stock) - available(a.stock)
      return a.product.name.localeCompare(b.product.name, 'es')
    })
}

export function filterMovements(
  movements: ReadonlyArray<Movement>,
  warehouse: WarehouseScope,
  query: string,
  type: string,
  day: string,
) {
  return movements.filter((movement) => {
    const product = inventoryProducts.find(
      (item) => item.id === movement.productId,
    )
    return (
      (warehouse === 'Todos' || movement.warehouse === warehouse) &&
      !!product &&
      matchesProduct(product, query) &&
      (type === 'Todos' || movement.type === type) &&
      (!day || movement.date.slice(0, 10) === day)
    )
  })
}

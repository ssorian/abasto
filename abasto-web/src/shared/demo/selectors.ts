import { findStock } from './inventory'
import { demoPendingOrders } from './orders'
import { findProduct } from './products'

import type { Product, WarehouseName } from './types'

/** Base units that can still be sold: on hand minus reservations, never negative. */
export function availableQuantity(productId: string, warehouse: WarehouseName) {
  const stock = findStock(productId, warehouse)
  if (!stock) return 0
  const onHand = stock.lots.reduce((sum, lot) => sum + lot.quantity, 0)
  return Math.max(0, onHand - stock.reserved)
}

/** Splits base units into the default presentation plus loose units, e.g. "82 cajas + 0 piezas". */
export function presentationBreakdown(product: Product, quantity: number) {
  const bulk = product.presentations.find(
    (presentation) => presentation.id === product.defaultPresentationId,
  )

  if (!bulk || bulk.factor <= 1) return `${quantity} ${product.baseUnit}`

  return `${Math.floor(quantity / bulk.factor)} ${bulk.name} + ${quantity % bulk.factor} ${product.baseUnit}`
}

export function availabilityLabel(productId: string, warehouse: WarehouseName) {
  const product = findProduct(productId)
  if (!product) return ''
  return presentationBreakdown(product, availableQuantity(productId, warehouse))
}

/** Value of the customer's non-cancelled pending orders, in cents. */
export function committedCents(customerId: string) {
  return demoPendingOrders
    .filter((order) => order.customerId === customerId)
    .reduce((sum, order) => sum + order.totalCents, 0)
}

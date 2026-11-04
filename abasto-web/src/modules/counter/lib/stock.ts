import { findProduct } from '#/shared/demo/products'

import type { Presentation, Product, WarehouseName } from '#/shared/demo/types'
import type { CounterState, Lot } from '#/modules/counter/types/counter'

export const stockKey = (productId: string, warehouse: WarehouseName) =>
  `${productId}:${warehouse}`

export const lotsFor = (
  state: CounterState,
  productId: string,
  warehouse: WarehouseName,
) => state.lots[stockKey(productId, warehouse)] ?? []

export const isBlocked = (lot: Lot) => lot.blocked || lot.expiresInDays < 0

/** Base units that can still be sold: usable minus reserved, never negative. */
export function availableUnits(lots: ReadonlyArray<Lot>) {
  const usable = lots
    .filter((lot) => !isBlocked(lot))
    .reduce((sum, lot) => sum + lot.quantity, 0)
  const reserved = lots.reduce((sum, lot) => sum + lot.reserved, 0)
  return Math.max(0, usable - reserved)
}

/** Earliest expiry first, then oldest reception. */
export const fefoOrder = (lots: ReadonlyArray<Lot>) =>
  [...lots]
    .filter((lot) => !isBlocked(lot))
    .sort(
      (a, b) =>
        a.expiresInDays - b.expiresInDays ||
        b.receivedDaysAgo - a.receivedDaysAgo,
    )

export function requireProduct(productId: string): Product {
  const product = findProduct(productId)
  if (!product) throw new Error('Producto no encontrado.')
  return product
}

export const defaultPresentation = (product: Product): Presentation =>
  product.presentations.find((p) => p.id === product.defaultPresentationId) ??
  product.presentations[0]

export const activePresentations = (product: Product) =>
  product.presentations.filter((p) => p.active)

export function presentationFor(product: Product, presentationId?: string) {
  const found = product.presentations.find(
    (p) => p.id === (presentationId || product.defaultPresentationId),
  )
  if (!found || !found.active) {
    throw new Error('La presentación está desactivada o no existe.')
  }
  return found
}

/** Price in cents of one presentation, derived from the lot price when it has one. */
export function presentationPriceCents(
  product: Product,
  presentation: Presentation,
  lot?: Pick<Lot, 'salePriceCents'>,
) {
  const bulk = defaultPresentation(product)
  const bulkPrice = lot?.salePriceCents ?? bulk.priceCents
  return Math.round((bulkPrice * presentation.factor) / bulk.factor)
}

/** Cost in cents of one base unit of a lot (fractional). */
export const unitCostCents = (product: Product, lot: Pick<Lot, 'costCents'>) =>
  lot.costCents / defaultPresentation(product).factor

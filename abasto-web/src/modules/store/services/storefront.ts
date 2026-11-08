/**
 * Customer-facing store backend: a public catalog read (published products,
 * list price, coarse availability) and the signed-in customer's reservation,
 * orders and cancellation. Everything returned here is a customer projection:
 * no lot codes, costs, creators or exact stock quantities.
 */
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { products } from '#/modules/catalog/db/schema'
import { computeQuotePreview } from '#/modules/counter/server/quote-preview'
import type { QuotePreview } from '#/modules/counter/server/quote-preview'
import { orders } from '#/modules/orders/db/schema'
import type { OrderStatus } from '#/modules/orders/db/schema'
import { now } from '#/modules/orders/services/clock'
import {
  fifoPlanner,
  lineListPrice,
  readSellableLots,
} from '#/modules/orders/services/order-allocation'
import { cancelOrderWith } from '#/modules/orders/services/order-actions'
import { orderNotFound, readOrder } from '#/modules/orders/services/order-reads'
import type { OrderDetail } from '#/modules/orders/services/order-reads'
import type { OrderLineInput } from '#/modules/orders/services/order-quotes'
import {
  requirePublished,
  reserveOrder,
} from '#/modules/orders/services/orders'
import { readWarehousePrices } from '#/modules/pricing/services/price-reads'
import type { StoreCustomer } from '#/modules/store/services/store-access'
import { warehouses } from '#/modules/warehouses/db/schema'

export type Availability = 'Disponible' | 'Pocas' | 'Agotado'
export type StoreWarehouse = { id: string; name: string }
export type StorePresentation = {
  id: string
  name: string
  factor: number
  isDefault: boolean
  priceCents: number
  availability: Availability
}
export type StoreProduct = {
  id: string
  name: string
  brand: string
  description: string
  category: string
  imageUrl: string | null
  presentations: Array<StorePresentation>
}
export type StoreOrderStatus = OrderStatus
export type StoreOrder = {
  id: string
  warehouseId: string
  warehouseName: string
  status: StoreOrderStatus
  totalCents: number
  notes: string
  createdAt: Date
  expiresAt: Date
  lines: Array<{
    productName: string
    presentationName: string
    quantity: number
    unitPriceCents: number
    lineTotalCents: number
  }>
}
export type StoreCartInput = {
  warehouseId: string
  lines: Array<OrderLineInput>
}

/** Presentations left: none → Agotado, a handful → Pocas, else Disponible. */
const FEW_LEFT = 5
export const availabilityOf = (units: number): Availability =>
  units < 1 ? 'Agotado' : units <= FEW_LEFT ? 'Pocas' : 'Disponible'

/** Every warehouse by name; the customer picks where to buy and pick up. */
export async function listStoreWarehouses(): Promise<Array<StoreWarehouse>> {
  const rows = await db
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/**
 * Published products with at least one priced active presentation in the
 * warehouse. A default presentation shows the sale price of the lot an order
 * would take (the same FIFO rule as the quote).
 */
export async function getStoreCatalog(
  warehouseId: string,
): Promise<Array<StoreProduct>> {
  const prices = await readWarehousePrices(db, warehouseId)
  const priced = prices.filter((row) => row.priceCents !== null)
  const productIds = [...new Set(priced.map((row) => row.productId))]
  if (!productIds.length) return []
  const details = new Map(
    (
      await db
        .select({
          id: products.id,
          brand: products.brand,
          description: products.description,
          imageUrl: products.imageUrl,
        })
        .from(products)
        .where(
          and(inArray(products.id, productIds), eq(products.published, true)),
        )
    ).map((row) => [row.id, row]),
  )
  const lots = await readSellableLots(db, warehouseId, [...details.keys()], {
    lock: false,
  })
  const plan = fifoPlanner(lots)
  const freeOf = (productId: string) =>
    lots
      .filter((lot) => lot.productId === productId)
      .reduce((sum, lot) => sum + lot.onHand - lot.reserved, 0)
  const catalog = new Map<string, StoreProduct>()
  for (const row of priced) {
    const detail = details.get(row.productId)
    if (!detail) continue
    const product = catalog.get(row.productId) ?? {
      id: row.productId,
      name: row.productName,
      brand: detail.brand,
      description: detail.description,
      category: row.category,
      imageUrl: detail.imageUrl,
      presentations: [],
    }
    const priceCents = row.isDefault
      ? lineListPrice({
          isDefault: true,
          firstLot: plan(row.productId, row.factor).firstLot,
          standardPriceCents: row.priceCents,
        })
      : row.priceCents
    product.presentations.push({
      id: row.presentationId,
      name: row.presentationName,
      factor: row.factor,
      isDefault: row.isDefault,
      priceCents: priceCents!,
      availability: availabilityOf(
        Math.floor(freeOf(row.productId) / row.factor),
      ),
    })
    catalog.set(row.productId, product)
  }
  return [...catalog.values()]
}

/** Read-only price of a cart with the customer's own commercial rules. */
export async function previewStoreCart(
  customer: StoreCustomer,
  input: StoreCartInput,
): Promise<QuotePreview> {
  await requirePublished(db, input.lines)
  return computeQuotePreview({
    warehouseId: input.warehouseId,
    customerId: customer.customerId,
    lines: input.lines,
  })
}

/** Reserves the cart (apartado) for the signed-in customer. No payment. */
export async function placeStoreOrder(
  customer: StoreCustomer,
  input: StoreCartInput & { notes?: string },
): Promise<StoreOrder> {
  const detail = await reserveOrder(
    { createdBy: customer.userId, source: 'store' },
    { ...input, customerId: customer.customerId },
  )
  return toStoreOrder(detail, await warehouseNameOf(detail.warehouseId))
}

/** The customer's own orders, newest first. */
export async function listMyOrders(
  customer: StoreCustomer,
): Promise<Array<StoreOrder>> {
  const heads = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.customerId, customer.customerId))
    .orderBy(desc(orders.createdAt), desc(orders.id))
  const result: Array<StoreOrder> = []
  for (const { id } of heads) {
    const detail = await readOrder(db, id)
    result.push(toStoreOrder(detail, await warehouseNameOf(detail.warehouseId)))
  }
  return result
}

/** Cancels an own order while it is Reservado, releasing its stock. */
export async function cancelMyOrder(
  customer: StoreCustomer,
  orderId: string,
): Promise<StoreOrder> {
  const detail = await cancelOrderWith(
    (head) => {
      if (head.customerId !== customer.customerId) throw orderNotFound()
    },
    orderId,
    ['Reservado'],
    'Tu pedido ya se está preparando. Comunícate con el almacén para cancelarlo.',
  )
  return toStoreOrder(detail, await warehouseNameOf(detail.warehouseId))
}

async function warehouseNameOf(warehouseId: string): Promise<string> {
  const row = (
    await db
      .select({ name: warehouses.name })
      .from(warehouses)
      .where(eq(warehouses.id, warehouseId))
  ).at(0)
  if (!row) throw new AppError('not_found', 'No encontramos ese almacén.')
  return row.name
}

/** Customer projection of an order; an overdue reservation reads as Vencido. */
function toStoreOrder(detail: OrderDetail, warehouseName: string): StoreOrder {
  const overdue =
    (detail.status === 'Reservado' || detail.status === 'Preparado') &&
    detail.expiresAt.getTime() <= now().getTime()
  return {
    id: detail.id,
    warehouseId: detail.warehouseId,
    warehouseName,
    status: overdue ? 'Vencido' : detail.status,
    totalCents: detail.totalCents,
    notes: detail.notes,
    createdAt: detail.createdAt,
    expiresAt: detail.expiresAt,
    lines: [...detail.lines]
      .sort(
        (a, b) =>
          a.productName.localeCompare(b.productName, 'es') ||
          b.factor - a.factor,
      )
      .map((line) => ({
        productName: line.productName,
        presentationName: line.presentationName,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
      })),
  }
}

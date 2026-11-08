import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations, products } from '#/modules/catalog/db/schema'
import { customers } from '#/modules/customers/db/schema'
import { customerNotFound } from '#/modules/customers/services/customers'
import { requireWarehouse } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import {
  orderAllocations,
  orderLines,
  orders,
} from '#/modules/orders/db/schema'
import type { OrderSource } from '#/modules/orders/db/schema'
import { now } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { reserveAllocations } from '#/modules/orders/services/order-allocation'
import {
  quoteLines,
  validateLines,
} from '#/modules/orders/services/order-quotes'
import type { OrderLineInput } from '#/modules/orders/services/order-quotes'
import { readOrder } from '#/modules/orders/services/order-reads'
import type { OrderDetail } from '#/modules/orders/services/order-reads'
import { readReservationHours } from '#/modules/orders/services/reservation-settings'

export type CreateOrderInput = {
  warehouseId: string
  customerId: string
  notes?: string
  lines: Array<OrderLineInput>
}

/**
 * Reserves stock for a customer: prices each line (warehouse price, then the
 * customer's rule), allocates lots FIFO and freezes everything in one
 * transaction. The reservation lasts the owner's configured hours.
 */
export async function createOrder(
  actor: Actor,
  input: CreateOrderInput,
): Promise<OrderDetail> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
  return reserveOrder({ createdBy: actor.userId, source: 'counter' }, input)
}

/**
 * The reservation itself, shared by the counter and the online store. It does
 * not authorize: callers do first. Store reservations refuse unpublished
 * products.
 */
export async function reserveOrder(
  origin: { createdBy: string; source: OrderSource },
  input: CreateOrderInput,
): Promise<OrderDetail> {
  validateLines(input.lines)
  return db.transaction(async (tx) => {
    await requireWarehouse(tx, input.warehouseId)
    await expireOverdueOrders(tx, input.warehouseId)
    const customer = (
      await tx
        .select({ active: customers.active })
        .from(customers)
        .where(eq(customers.id, input.customerId))
    ).at(0)
    if (!customer) throw customerNotFound()
    if (!customer.active) {
      throw new AppError('conflict', 'Este cliente está inactivo.')
    }
    if (origin.source === 'store') {
      await requirePublished(tx, input.lines)
    }
    const quotes = await quoteLines(tx, input, input.lines)
    const allocations = await reserveAllocations(tx, quotes)
    const createdAt = now()
    const hours = await readReservationHours(tx)
    const [order] = await tx
      .insert(orders)
      .values({
        warehouseId: input.warehouseId,
        customerId: input.customerId,
        status: 'Reservado',
        notes: input.notes?.trim() ?? '',
        totalCents: quotes.reduce((sum, q) => sum + q.lineTotalCents, 0),
        source: origin.source,
        createdBy: origin.createdBy,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + hours * 3_600_000),
      })
      .returning({ id: orders.id })
    const lines = await tx
      .insert(orderLines)
      .values(
        quotes.map((q) => ({
          orderId: order.id,
          productId: q.productId,
          presentationId: q.presentationId,
          quantity: q.quantity,
          baseQuantity: q.baseQuantity,
          listPriceCents: q.listPriceCents,
          ruleMinQuantity: q.rule?.minQuantity ?? null,
          ruleDiscountBps: q.rule?.discountBps ?? null,
          rulePriceCents: q.rule?.priceCents ?? null,
          unitPriceCents: q.unitPriceCents,
          lineTotalCents: q.lineTotalCents,
        })),
      )
      .returning({
        id: orderLines.id,
        presentationId: orderLines.presentationId,
      })
    const lineIdOf = new Map(lines.map((l) => [l.presentationId, l.id]))
    await tx.insert(orderAllocations).values(
      quotes.flatMap((q, index) =>
        allocations[index].map((a) => ({
          orderLineId: lineIdOf.get(q.presentationId)!,
          lotId: a.lotId,
          quantity: a.quantity,
        })),
      ),
    )
    return readOrder(tx, order.id)
  })
}

/** Store lines may only name presentations of published products. */
export async function requirePublished(
  executor: Pick<Tx, 'select'>,
  lines: Array<OrderLineInput>,
) {
  if (!lines.length) return
  const hidden = await executor
    .select({ id: products.id })
    .from(presentations)
    .innerJoin(products, eq(products.id, presentations.productId))
    .where(
      and(
        inArray(
          presentations.id,
          lines.map((line) => line.presentationId),
        ),
        eq(products.published, false),
      ),
    )
  if (hidden.length) {
    throw new AppError(
      'conflict',
      'Ese producto no está disponible en la tienda.',
    )
  }
}

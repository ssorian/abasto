import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { customers } from '#/modules/customers/db/schema'
import { customerNotFound } from '#/modules/customers/services/customers'
import { requireWarehouse } from '#/modules/inventory/services/stock-ledger'
import {
  orderAllocations,
  orderLines,
  orders,
} from '#/modules/orders/db/schema'
import { now } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { allocateFefo } from '#/modules/orders/services/order-allocation'
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
 * customer's rule), allocates lots FEFO and freezes everything in one
 * transaction. The reservation lasts the owner's configured hours.
 */
export async function createOrder(
  actor: Actor,
  input: CreateOrderInput,
): Promise<OrderDetail> {
  authorize(actor, 'warehouse.operate', input.warehouseId)
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
    const quotes = await quoteLines(tx, actor, input, input.lines)
    const allocations = await allocateFefo(tx, input.warehouseId, quotes)
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
        createdBy: actor.userId,
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

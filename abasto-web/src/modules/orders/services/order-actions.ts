import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { appendMovement } from '#/modules/inventory/services/stock-ledger'
import type { Tx } from '#/modules/inventory/services/stock-ledger'
import { orders } from '#/modules/orders/db/schema'
import type { OrderStatus } from '#/modules/orders/db/schema'
import { now } from '#/modules/orders/services/clock'
import { expireOverdueOrders } from '#/modules/orders/services/expiry'
import { orderNotFound, readOrder } from '#/modules/orders/services/order-reads'
import type { OrderDetail } from '#/modules/orders/services/order-reads'
import { assertPickupAllowed } from '#/modules/orders/services/pickup-gate'
import {
  allocationsOf,
  hasExpiredLot,
  lockLotsInOrder,
  releaseReserved,
} from '#/modules/orders/services/reservations'

type Order = typeof orders.$inferSelect

const expiredOrder = () =>
  new AppError(
    'conflict',
    'El pedido venció y se liberó el producto. Crea un pedido nuevo.',
  )

/**
 * Runs one status change: authorizes on the order's warehouse, expires
 * overdue orders first (committed even when this order turns out expired),
 * locks the order and checks the transition.
 */
async function transition(
  actor: Actor,
  orderId: string,
  from: ReadonlyArray<OrderStatus>,
  notAllowed: string,
  apply: (tx: Tx, order: Order) => Promise<void>,
): Promise<OrderDetail> {
  const head = (
    await db
      .select({ warehouseId: orders.warehouseId })
      .from(orders)
      .where(eq(orders.id, orderId))
  ).at(0)
  if (!head) throw orderNotFound()
  authorize(actor, 'warehouse.operate', head.warehouseId)
  const outcome = await db.transaction(async (tx) => {
    await expireOverdueOrders(tx, head.warehouseId)
    const order = (
      await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    ).at(0)
    if (!order) throw orderNotFound()
    if (order.status === 'Vencido') return null
    if (!from.includes(order.status)) throw new AppError('conflict', notAllowed)
    await apply(tx, order)
    return readOrder(tx, orderId)
  })
  if (!outcome) throw expiredOrder()
  return outcome
}

/** Reservado → Preparado; the reservation stays. */
export const prepareOrder = (actor: Actor, orderId: string) =>
  transition(
    actor,
    orderId,
    ['Reservado'],
    'Solo se puede preparar un pedido reservado.',
    async (tx) => {
      await tx
        .update(orders)
        .set({ status: 'Preparado', preparedAt: now() })
        .where(eq(orders.id, orderId))
    },
  )

/** Reservado/Preparado → Cancelado; releases the reserved units. */
export const cancelOrder = (actor: Actor, orderId: string) =>
  transition(
    actor,
    orderId,
    ['Reservado', 'Preparado'],
    'Solo se puede cancelar un pedido reservado o preparado.',
    async (tx) => {
      await releaseReserved(tx, [orderId])
      await tx
        .update(orders)
        .set({ status: 'Cancelado', closedAt: now() })
        .where(eq(orders.id, orderId))
    },
  )

/**
 * Reservado/Preparado → Recogido (whole order): appends one `sale` movement
 * per allocation and lowers `on_hand` and `reserved` together.
 */
export const pickupOrder = (actor: Actor, orderId: string) =>
  transition(
    actor,
    orderId,
    ['Reservado', 'Preparado'],
    'Solo se puede entregar un pedido reservado o preparado.',
    async (tx, order) => {
      if (await hasExpiredLot(tx, orderId)) {
        throw new AppError(
          'conflict',
          'Un lote de este pedido ya caducó. Cancélalo y crea un pedido nuevo.',
        )
      }
      await assertPickupAllowed(tx, order)
      const allocations = await allocationsOf(tx, orderId)
      const locked = await lockLotsInOrder(
        tx,
        allocations.map((a) => a.lotId),
      )
      for (const { lotId, quantity } of allocations) {
        await appendMovement(
          tx,
          locked.get(lotId)!,
          {
            type: 'sale',
            quantity: -quantity,
            reason: 'Pedido recogido',
            reference: orderId,
            actorId: actor.userId,
          },
          { fromReserved: true },
        )
      }
      await tx
        .update(orders)
        .set({ status: 'Recogido', closedAt: now() })
        .where(eq(orders.id, orderId))
    },
  )

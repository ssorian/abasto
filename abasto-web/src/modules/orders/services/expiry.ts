import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm'
import { orders } from '#/modules/orders/db/schema'
import { now } from '#/modules/orders/services/clock'
import { releaseReserved } from '#/modules/orders/services/reservations'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

/**
 * Serializes the stock writes of one warehouse for the rest of the
 * transaction. Every order or stock write takes it first (expiry locks the
 * lots of overdue orders, which would otherwise cross with the lots the
 * operation itself locks and deadlock), so lot locks are never contended
 * across operations of the same warehouse.
 */
export async function lockWarehouseStock(tx: Tx, warehouseId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`stock:${warehouseId}`}, 0))`,
  )
}

/**
 * Lazy expiry: overdue Reservado orders of a warehouse become
 * Vencido and give their units back. Call it inside the transaction of any
 * order or stock write in that warehouse, before reading or locking stock;
 * it takes the warehouse stock lock first.
 */
export async function expireOverdueOrders(tx: Tx, warehouseId: string) {
  await lockWarehouseStock(tx, warehouseId)
  const at = now()
  const overdue = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.warehouseId, warehouseId),
        inArray(orders.status, ['Reservado']),
        lte(orders.expiresAt, at),
      ),
    )
    .orderBy(asc(orders.id))
    .for('update')
  if (!overdue.length) return
  const ids = overdue.map((order) => order.id)
  await releaseReserved(tx, ids)
  await tx
    .update(orders)
    .set({ status: 'Vencido', closedAt: at })
    .where(inArray(orders.id, ids))
}

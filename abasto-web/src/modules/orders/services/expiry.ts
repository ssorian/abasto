import { and, asc, eq, inArray, lte } from 'drizzle-orm'
import { orders } from '#/modules/orders/db/schema'
import { now } from '#/modules/orders/services/clock'
import { releaseReserved } from '#/modules/orders/services/reservations'
import type { Tx } from '#/modules/inventory/services/stock-ledger'

/**
 * Lazy expiry: overdue Reservado/Preparado orders of a warehouse become
 * Vencido and give their units back. Call it inside the transaction of any
 * order or stock write in that warehouse, before reading or locking stock.
 */
export async function expireOverdueOrders(tx: Tx, warehouseId: string) {
  const at = now()
  const overdue = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.warehouseId, warehouseId),
        inArray(orders.status, ['Reservado', 'Preparado']),
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

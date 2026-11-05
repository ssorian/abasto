import { asc, eq, inArray, sql } from 'drizzle-orm'
import { lots } from '#/modules/inventory/db/schema'
import type { Lot, Tx } from '#/modules/inventory/services/stock-ledger'
import { orderAllocations, orderLines } from '#/modules/orders/db/schema'

/** Locks the given lots in id order, the same order every order operation uses. */
export async function lockLotsInOrder(
  tx: Tx,
  lotIds: Array<string>,
): Promise<Map<string, Lot>> {
  if (!lotIds.length) return new Map()
  const rows = await tx
    .select()
    .from(lots)
    .where(inArray(lots.id, lotIds))
    .orderBy(asc(lots.id))
    .for('update')
  return new Map(rows.map((lot) => [lot.id, lot]))
}

/** Allocations of the orders: one row per (order, line, lot). */
export async function allocationsOf(tx: Tx, orderId: string) {
  return tx
    .select({
      lotId: orderAllocations.lotId,
      quantity: orderAllocations.quantity,
    })
    .from(orderAllocations)
    .innerJoin(orderLines, eq(orderLines.id, orderAllocations.orderLineId))
    .where(eq(orderLines.orderId, orderId))
    .orderBy(asc(orderAllocations.id))
}

/** Gives the reserved units of these orders back to their lots (locked in id order). */
export async function releaseReserved(tx: Tx, orderIds: Array<string>) {
  const perLot = new Map<string, number>()
  for (const orderId of orderIds) {
    for (const { lotId, quantity } of await allocationsOf(tx, orderId)) {
      perLot.set(lotId, (perLot.get(lotId) ?? 0) + quantity)
    }
  }
  await lockLotsInOrder(tx, [...perLot.keys()])
  for (const [lotId, quantity] of perLot) {
    await tx
      .update(lots)
      .set({ reserved: sql`${lots.reserved} - ${quantity}` })
      .where(eq(lots.id, lotId))
  }
}

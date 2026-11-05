/** Shared fixtures for transfer service tests. */
import { asc, count } from 'drizzle-orm'
import { db } from '#/db'
import { lots } from '#/modules/inventory/db/schema'
import { inventoryState } from '#/modules/inventory/services/testing'
import { setupOrders } from '#/modules/orders/services/testing'
import { transferLines, transfers } from '#/modules/transfers/db/schema'

export { ledgerSum, onHandOf } from '#/modules/inventory/services/testing'
export { errorOf, receive } from '#/modules/orders/services/testing'

export const setupTransfers = setupOrders
export type TransfersFixture = Awaited<ReturnType<typeof setupOrders>>

/** Everything a rejected transfer operation must leave untouched. */
export async function transferState() {
  const total = async (table: typeof transfers | typeof transferLines) =>
    (await db.select({ value: count() }).from(table))[0]?.value
  return {
    ...(await inventoryState()),
    transfers: await db.select().from(transfers).orderBy(asc(transfers.id)),
    lines: await db.select().from(transferLines).orderBy(asc(transferLines.id)),
    transferCount: await total(transfers),
    allLots: await db.select().from(lots).orderBy(asc(lots.id)),
  }
}

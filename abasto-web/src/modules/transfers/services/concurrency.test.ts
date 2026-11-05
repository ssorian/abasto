import { beforeEach, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import {
  adjustLot,
  registerLoss,
} from '#/modules/inventory/services/stock-adjustments'
import { countStock } from '#/modules/inventory/services/stock-counts'
import { createOrder } from '#/modules/orders/services/orders'
import { transferLines } from '#/modules/transfers/db/schema'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'
import { receive, setupTransfers } from '#/modules/transfers/services/testing'

beforeEach(() => resetDatabase(db))

test('dispatches racing orders and withdrawals keep stock non-negative and the ledger equal to on_hand', async () => {
  for (let round = 0; round < 4; round++) {
    await resetDatabase(db)
    const fx = await setupTransfers()
    const first = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 20,
      expiresOn: '2098-01-01',
    })
    const second = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 15,
      expiresOn: '2099-01-01',
    })
    const send = (quantity: number) =>
      dispatchTransfer(fx.managerA, {
        fromWarehouseId: fx.a.id,
        toWarehouseId: fx.b.id,
        items: [{ productId: fx.milkBox.id, quantity }],
      })
    const order = (quantity: number) =>
      createOrder(fx.clerkA, {
        warehouseId: fx.a.id,
        customerId: fx.customer.id,
        lines: [{ presentationId: fx.pieceId, quantity }],
      })
    await Promise.allSettled([
      send(9),
      send(9),
      send(9),
      order(8),
      order(8),
      registerLoss(fx.managerA, {
        lotId: first.id,
        quantity: 5,
        category: 'otro',
        reason: 'x',
      }),
      adjustLot(fx.managerA, { lotId: second.id, quantity: -4, reason: 'x' }),
      countStock(fx.managerA, {
        productId: fx.milkBox.id,
        warehouseId: fx.a.id,
        countedQuantity: 10,
      }),
    ])
    const rows = await db.select().from(lots)
    for (const lot of rows) {
      expect(lot.onHand).toBeGreaterThanOrEqual(0)
      expect(lot.reserved).toBeGreaterThanOrEqual(0)
      expect(lot.reserved).toBeLessThanOrEqual(lot.onHand)
      const [sum] = await db
        .select({
          value: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)::int`,
        })
        .from(stockMovements)
        .where(eq(stockMovements.lotId, lot.id))
      expect(sum.value).toBe(lot.onHand)
    }
    // What left through dispatches is exactly what the transfer lines say.
    const [sent] = await db
      .select({
        value: sql<number>`coalesce(sum(${transferLines.quantity}), 0)::int`,
      })
      .from(transferLines)
    const [out] = await db
      .select({
        value: sql<number>`coalesce(-sum(${stockMovements.quantity}), 0)::int`,
      })
      .from(stockMovements)
      .where(eq(stockMovements.type, 'transfer_out'))
    expect(out.value).toBe(sent.value)
    expect(sent.value).toBeGreaterThan(0)
  }
})

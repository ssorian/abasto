import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { lots } from '#/modules/inventory/db/schema'
import {
  cancelSupplierOrder,
  createSupplierOrder,
  getSupplierOrder,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  listSupplierPendings,
  returnPendings,
  scrapPendings,
} from '#/modules/inventory/services/supplier-pendings'
import { registerLoss } from '#/modules/inventory/services/stock-adjustments'
import {
  errorOf,
  lineFor,
  setupSupplierOrders,
} from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'
import { businessDate } from '#/modules/orders/services/clock'
import { addDays } from '#/modules/reports/lib/period'
import { getOwnerDashboard } from '#/modules/reports/services/owner-dashboard'
import { getSupplierRecovery } from '#/modules/reports/services/supplier-recovery'

beforeEach(() => resetDatabase(db))

const today = () => businessDate()
const period = () => ({
  period: { preset: 'custom' as const, from: today(), to: today() },
})

/** Orders milk and receives it with `missing`/`damaged` boxes. */
async function receiveMilk(
  fx: SupplierFixture,
  boxes: number,
  missing: number,
  damaged: number,
) {
  const created = await createSupplierOrder(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId: fx.a.id,
    lines: [lineFor(fx.milk, boxes)],
  })
  const order = await getSupplierOrder(fx.owner, created.id)
  await receiveSupplierOrder(fx.owner, {
    purchaseId: order.id,
    lines: [
      {
        lineId: order.lines[0].id,
        receivedBoxes: boxes - missing,
        damagedBoxes: damaged,
        noExpiry: true,
      },
    ],
  })
}

const pendingsOf = async (fx: SupplierFixture) =>
  listSupplierPendings(fx.owner, fx.supplier.id)

/** A period that ended before every entry of the test was written. */
const pastPeriod = {
  period: {
    preset: 'custom' as const,
    from: '2000-01-01',
    to: '2000-01-31',
  },
}

const read = (fx: SupplierFixture, extra: { supplierId?: string } = {}) =>
  getSupplierRecovery(fx.owner, { ...period(), ...extra })

describe('recovered', () => {
  test('adds discounts of missing balances and of credits, and replacements, with their breakdown', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 3)
    const restock = (await pendingsOf(fx)).restock[0]
    const damaged = (await pendingsOf(fx)).returns[0]
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 2,
      resolution: 'discount',
      creditCents: 2500,
    })
    const credit = (await pendingsOf(fx)).credits[0]
    // Discount the missing balance (4032) and the credit (2500) in one order.
    await createSupplierOrder(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.milk, 10)],
      discounts: [
        { pendingId: restock.pendingId },
        { pendingId: credit.pendingId },
      ],
    })
    const result = await read(fx)
    expect(result.discountedCents).toBe(6532)
    expect(result.replacedCents).toBe(0)
    expect(result.recoveredCents).toBe(6532)
  })

  test('a discount cancelled and applied again counts once', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const balance = (await pendingsOf(fx)).restock[0]
    const discountOn = () =>
      createSupplierOrder(fx.owner, {
        supplierId: fx.supplier.id,
        warehouseId: fx.a.id,
        lines: [lineFor(fx.milk, 5)],
        discounts: [{ pendingId: balance.pendingId }],
      })
    const first = await discountOn()
    await cancelSupplierOrder(fx.owner, first.id)
    await discountOn()
    const result = await read(fx)
    expect(result.discountedCents).toBe(4032)
    expect(result.recoveredCents).toBe(4032)
    expect(result.pendingCents).toBe(0)
  })

  test('a replacement received counts as replaced merchandise', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const restock = (await pendingsOf(fx)).restock[0]
    const created = await createSupplierOrder(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.milk, 1)],
    })
    const order = await getSupplierOrder(fx.owner, created.id)
    await receiveSupplierOrder(fx.owner, {
      purchaseId: order.id,
      lines: [
        {
          lineId: order.lines[0].id,
          receivedBoxes: order.lines[0].boxes,
          damagedBoxes: 0,
          noExpiry: true,
        },
      ],
      replacements: [
        { pendingId: restock.pendingId, boxes: 2, noExpiry: true },
      ],
    })
    const result = await read(fx)
    expect(result.replacedCents).toBe(2688)
    expect(result.discountedCents).toBe(0)
    expect(result.recoveredCents).toBe(2688)
  })

  test('a cancelled discounting order leaves nothing recovered', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const restock = (await pendingsOf(fx)).restock[0]
    const order = await createSupplierOrder(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.milk, 5)],
      discounts: [{ pendingId: restock.pendingId }],
    })
    expect((await read(fx)).recoveredCents).toBe(4032)
    await cancelSupplierOrder(fx.owner, order.id)
    const result = await read(fx)
    expect(result.discountedCents).toBe(0)
    expect(result.recoveredCents).toBe(0)
    expect(result.pendingCents).toBe(4032)
  })
})

describe('pending', () => {
  test('is the open value of missing, damaged and credit balances, net of what was settled', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 3)
    // missing 4032 + damaged 4032 open.
    expect((await read(fx)).pendingCents).toBe(8064)
    const damaged = (await pendingsOf(fx)).returns[0]
    await scrapPendings(fx.owner, { pendingId: damaged.pendingId, boxes: 1 })
    expect((await read(fx)).pendingCents).toBe(6720)
    // Returning 1 box with a 1000 credit: damaged -1344, credit +1000.
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'discount',
      creditCents: 1000,
    })
    expect((await read(fx)).pendingCents).toBe(6376)
  })

  test('ignores the period: old balances are still pending', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const past = await getSupplierRecovery(fx.owner, pastPeriod)
    expect(past.pendingCents).toBe(4032)
  })
})

describe('lost', () => {
  test('adds merma, the unrecognized part of return discounts and valued stock losses', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 4)
    const damaged = (await pendingsOf(fx)).returns[0]
    await scrapPendings(fx.owner, { pendingId: damaged.pendingId, boxes: 1 })
    // Returned value 2 × 1344 = 2688, credited 2000: 688 unrecognized.
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 2,
      resolution: 'discount',
      creditCents: 2000,
    })
    // 6 pieces of a lot costing 112 each (1344 per 12).
    const [lot] = await db.select().from(lots)
    await registerLoss(fx.owner, {
      lotId: lot.id,
      quantity: 6,
      category: 'caducado',
      reason: 'vencida',
    })
    const result = await read(fx)
    expect(result.scrappedCents).toBe(1344)
    expect(result.unrecognizedCents).toBe(688)
    expect(result.inventoryLossCents).toBe(672)
    expect(result.lostCents).toBe(1344 + 688 + 672)
  })

  test('a credit above the returned value loses nothing; a replacement return is replaced merchandise', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 3)
    const damaged = (await pendingsOf(fx)).returns[0]
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'discount',
      creditCents: 5000,
    })
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'replacement',
    })
    const result = await read(fx)
    expect(result.unrecognizedCents).toBe(0)
    expect(result.lostCents).toBe(0)
    expect(result.replacedCents).toBe(1344)
    expect(result.recoveredCents).toBe(1344)
  })

  test('values a stock loss at the lot unit cost, rounded once per movement', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 0)
    const [lot] = await db.select().from(lots)
    await db
      .update(lots)
      .set({ receivedCostCents: 100, receivedQuantity: 3 })
      .where(eq(lots.id, lot.id))
    await registerLoss(fx.owner, {
      lotId: lot.id,
      quantity: 2,
      category: 'dañado',
      reason: 'golpe',
    })
    await registerLoss(fx.owner, {
      lotId: lot.id,
      quantity: 1,
      category: 'otro',
      reason: 'x',
    })
    // round(66.67) + round(33.33)
    expect((await read(fx)).inventoryLossCents).toBe(67 + 33)
  })
})

describe('period and filters', () => {
  test('entries outside the period are excluded from recovered and lost, not from pending', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 3)
    const restock = (await pendingsOf(fx)).restock[0]
    const damaged = (await pendingsOf(fx)).returns[0]
    await scrapPendings(fx.owner, { pendingId: damaged.pendingId, boxes: 1 })
    await createSupplierOrder(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.milk, 5)],
      discounts: [{ pendingId: restock.pendingId }],
    })
    const [lot] = await db.select().from(lots)
    await registerLoss(fx.owner, {
      lotId: lot.id,
      quantity: 1,
      category: 'otro',
      reason: 'x',
    })
    const inside = await read(fx)
    expect(inside.discountedCents).toBe(4032)
    expect(inside.scrappedCents).toBe(1344)
    const past = await getSupplierRecovery(fx.owner, pastPeriod)
    expect(past.recoveredCents).toBe(0)
    expect(past.scrappedCents).toBe(0)
    expect(past.inventoryLossCents).toBe(0)
    expect(past.pendingCents).toBe(inside.pendingCents)
    // Yesterday alone excludes today's entries; yesterday..today includes them.
    const yesterday = addDays(today(), -1)
    const onlyYesterday = await getSupplierRecovery(fx.owner, {
      period: { preset: 'custom', from: yesterday, to: yesterday },
    })
    expect(onlyYesterday.discountedCents).toBe(0)
    expect(onlyYesterday.scrappedCents).toBe(0)
    expect(onlyYesterday.inventoryLossCents).toBe(0)
    const both = await getSupplierRecovery(fx.owner, {
      period: { preset: 'custom', from: yesterday, to: today() },
    })
    expect(both).toMatchObject({
      discountedCents: 4032,
      scrappedCents: 1344,
      inventoryLossCents: inside.inventoryLossCents,
    })
  })

  test('supplier filter limits balances and stock losses to that supplier; warehouse filters stock losses only', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const [lot] = await db.select().from(lots)
    await registerLoss(fx.owner, {
      lotId: lot.id,
      quantity: 12,
      category: 'otro',
      reason: 'x',
    })
    const own = await read(fx, { supplierId: fx.supplier.id })
    expect(own.pendingCents).toBe(4032)
    expect(own.inventoryLossCents).toBe(1344)
    const other = await read(fx, { supplierId: fx.cocaCola.id })
    expect(other.pendingCents).toBe(0)
    expect(other.inventoryLossCents).toBe(0)
    const inB = await getSupplierRecovery(fx.owner, {
      ...period(),
      warehouseIds: [fx.b.id],
    })
    expect(inB.inventoryLossCents).toBe(0)
    expect(inB.pendingCents).toBe(4032)
    const inA = await getSupplierRecovery(fx.owner, {
      ...period(),
      warehouseIds: [fx.a.id],
    })
    expect(inA.inventoryLossCents).toBe(1344)
  })
})

describe('authorization and dashboard', () => {
  test('only the owner can read it, and a foreign warehouse is refused', async () => {
    const fx = await setupSupplierOrders()
    const forbidden = 'No tienes permiso para esta acción.'
    for (const actor of [fx.managerA, fx.staffA]) {
      const error = await errorOf(() => getSupplierRecovery(actor, period()))
      expect(error).toMatchObject({ code: 'forbidden', message: forbidden })
    }
    const bad = await errorOf(() =>
      getSupplierRecovery(fx.owner, {
        ...period(),
        warehouseIds: ['00000000-0000-0000-0000-000000000000'],
      }),
    )
    expect(bad).toMatchObject({ code: 'forbidden' })
  })

  test('the owner dashboard carries the same figures', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const result = await getOwnerDashboard(fx.owner, period())
    expect(result.data!.supplierRecovery).toEqual(await read(fx))
    expect(result.data!.supplierRecovery.pendingCents).toBe(4032)
  })
})

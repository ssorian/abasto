import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
import { createOrder } from '#/modules/orders/services/orders'
import { pickupOrder } from '#/modules/orders/services/order-actions'
import { payCash } from '#/modules/orders/services/testing'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  errorOf,
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const wide = {
  period: {
    preset: 'custom' as const,
    from: '2026-11-01',
    to: '2026-11-30',
  },
}
const forbidden = 'No tienes permiso para esta acción.'

/**
 * Milk (supplier) and water (no supplier) in A, milk in B.
 * Sold: A milk 4 (4000 / 402), A water 5 (2000 / 250), B milk 3 (3000 / 300).
 * Left on hand: A milk 6 (603), A water 5 (250), B milk 7 (700).
 */
async function fixture() {
  const fx = await setupReports()
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 10,
    totalCostCents: 1005,
    expiresOn: farFuture,
  })
  await receive(fx, {
    productId: fx.water.id,
    quantity: 10,
    totalCostCents: 500,
    expiresOn: farFuture,
  })
  await receive(fx, {
    productId: fx.milkBox.id,
    warehouseId: fx.b.id,
    quantity: 10,
    totalCostCents: 1000,
    expiresOn: farFuture,
  })
  await setPrices(fx.owner, {
    warehouseId: fx.a.id,
    prices: [{ presentationId: fx.piece(fx.water).id, priceCents: 400 }],
  })
  await fx.sell({ at: '2026-11-02T18:00:00Z', quantity: 4 })
  await fx.sell({
    at: '2026-11-02T19:00:00Z',
    quantity: 3,
    warehouseId: fx.b.id,
  })
  useClock(() => new Date('2026-11-03T18:00:00Z'))
  const order = await createOrder(fx.staffA, {
    warehouseId: fx.a.id,
    customerId: fx.customer.id,
    lines: [{ presentationId: fx.piece(fx.water).id, quantity: 5 }],
  })
  await pickupOrder(fx.staffA, order.id, payCash)
  return fx
}

const unknown = crypto.randomUUID()

describe('margin report filters', () => {
  test('warehouse, supplier and both narrow the totals exactly', async () => {
    const fx = await fixture()
    const pick = (r: Awaited<ReturnType<typeof getMarginReport>>) => [
      r.summary.revenueCents,
      r.summary.costCents,
    ]
    expect(pick(await getMarginReport(fx.owner, wide))).toEqual([9000, 952])
    const byWarehouse = await getMarginReport(fx.owner, {
      ...wide,
      warehouseIds: [fx.b.id],
    })
    expect(pick(byWarehouse)).toEqual([3000, 300])
    expect(byWarehouse.warehouses.map((w) => w.id)).toEqual([fx.b.id])
    expect(byWarehouse.byWarehouse.map((w) => w.key)).toEqual([fx.b.id])
    const bySupplier = await getMarginReport(fx.owner, {
      ...wide,
      supplierId: fx.supplier.id,
    })
    expect(pick(bySupplier)).toEqual([7000, 702])
    expect(bySupplier.byProduct.map((p) => p.key)).toEqual([fx.milkBox.id])
    expect(bySupplier.bySupplier.map((s) => s.key)).toEqual([fx.supplier.id])
    const both = await getMarginReport(fx.owner, {
      ...wide,
      warehouseIds: [fx.a.id],
      supplierId: fx.supplier.id,
    })
    expect(pick(both)).toEqual([4000, 402])
  })

  test('an unknown or malformed supplier is empty; an unknown warehouse is refused', async () => {
    const fx = await fixture()
    for (const supplierId of [unknown, 'nope']) {
      const report = await getMarginReport(fx.owner, { ...wide, supplierId })
      expect(report.summary.revenueCents).toBe(0)
      expect(report.byProduct).toEqual([])
    }
    const error = await errorOf(() =>
      getMarginReport(fx.owner, { ...wide, warehouseIds: [unknown] }),
    )
    expect(error).toMatchObject({ code: 'forbidden', message: forbidden })
  })
})

describe('warehouse ranking filters', () => {
  test('supplier narrows each warehouse; warehouse narrows the rows', async () => {
    const fx = await fixture()
    const supplier = await getWarehouseRanking(fx.owner, {
      ...wide,
      supplierId: fx.supplier.id,
    })
    expect(supplier.rows.map((r) => [r.key, r.current.revenueCents])).toEqual([
      [fx.a.id, 4000],
      [fx.b.id, 3000],
    ])
    const both = await getWarehouseRanking(fx.owner, {
      ...wide,
      warehouseIds: [fx.a.id],
      supplierId: fx.supplier.id,
    })
    expect(both.rows.map((r) => [r.key, r.current.revenueCents])).toEqual([
      [fx.a.id, 4000],
    ])
    expect(
      (
        await getWarehouseRanking(fx.owner, { ...wide, supplierId: 'nope' })
      ).rows.map((r) => r.current.revenueCents),
    ).toEqual([0, 0])
    expect(
      await errorOf(() =>
        getWarehouseRanking(fx.owner, { ...wide, warehouseIds: [unknown] }),
      ),
    ).toMatchObject({ code: 'forbidden' })
  })
})

describe('inventory filters', () => {
  test('inventory value by warehouse, supplier and both', async () => {
    const fx = await fixture()
    const rows = (v: Awaited<ReturnType<typeof getInventoryValue>>) =>
      v.warehouses.map((w) => [w.id, w.valueCents])
    const all = await getInventoryValue(fx.owner)
    expect(all.totalCents).toBe(1553)
    const b = await getInventoryValue(fx.owner, { warehouseIds: [fx.b.id] })
    expect(rows(b)).toEqual([[fx.b.id, 700]])
    expect(b.totalCents).toBe(700)
    const s = await getInventoryValue(fx.owner, { supplierId: fx.supplier.id })
    expect(s.totalCents).toBe(1303)
    expect(rows(s)).toEqual([
      [fx.a.id, 603],
      [fx.b.id, 700],
    ])
    const both = await getInventoryValue(fx.owner, {
      warehouseIds: [fx.a.id],
      supplierId: fx.supplier.id,
    })
    expect(both.totalCents).toBe(603)
    for (const supplierId of [unknown, 'nope']) {
      expect(
        (await getInventoryValue(fx.owner, { supplierId })).totalCents,
      ).toBe(0)
    }
    expect(
      await errorOf(() =>
        getInventoryValue(fx.owner, { warehouseIds: [unknown] }),
      ),
    ).toMatchObject({ code: 'forbidden', message: forbidden })
  })

  test('non-moving capital by warehouse, supplier and both', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1005,
      expiresOn: farFuture,
    })
    await receive(fx, {
      productId: fx.water.id,
      quantity: 10,
      totalCostCents: 500,
      expiresOn: farFuture,
    })
    await receive(fx, {
      productId: fx.milkBox.id,
      warehouseId: fx.b.id,
      quantity: 10,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    expect((await getNonMovingCapital(fx.owner)).totalCents).toBe(2505)
    expect(
      (await getNonMovingCapital(fx.owner, { warehouseIds: [fx.b.id] }))
        .totalCents,
    ).toBe(1000)
    expect(
      (await getNonMovingCapital(fx.owner, { supplierId: fx.supplier.id }))
        .totalCents,
    ).toBe(2005)
    const both = await getNonMovingCapital(fx.owner, {
      warehouseIds: [fx.a.id],
      supplierId: fx.supplier.id,
    })
    expect(both.totalCents).toBe(1005)
    expect(both.rows.map((r) => r.productId)).toEqual([fx.milkBox.id])
    for (const supplierId of [unknown, 'nope']) {
      expect(
        (await getNonMovingCapital(fx.owner, { supplierId })).rows,
      ).toEqual([])
    }
    expect(
      await errorOf(() =>
        getNonMovingCapital(fx.owner, { warehouseIds: [unknown] }),
      ),
    ).toMatchObject({ code: 'forbidden' })
  })
})

describe('filters never change who may read', () => {
  test('a manager passing filters is refused, not validated', async () => {
    const fx = await setupReports()
    const filters = { warehouseIds: [unknown], supplierId: 'nope' }
    for (const run of [
      () => getMarginReport(fx.managerB, { ...wide, ...filters }),
      () => getWarehouseRanking(fx.managerB, { ...wide, ...filters }),
      () => getInventoryValue(fx.managerB, filters),
      () => getNonMovingCapital(fx.managerB, { ...filters, days: 45 }),
    ]) {
      expect(await errorOf(run)).toMatchObject({
        code: 'forbidden',
        message: forbidden,
      })
    }
  })
})

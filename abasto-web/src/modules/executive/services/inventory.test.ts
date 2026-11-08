import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import { businessDate } from '#/modules/orders/services/clock'
import { addDays } from '#/modules/reports/lib/period'
import {
  errorOf,
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const daysAgoAt = (days: number) =>
  `${addDays(businessDate(), -days)}T18:00:00Z`

describe('inventory value', () => {
  test('values every lot with stock at its own rounded unit cost', async () => {
    const fx = await setupReports()
    // 7 units for 1000 → 3 on hand after nothing sold: 7 × 1000/7 = 1000.
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 7,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    // 6 units for 301 → 301 exactly.
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 6,
      totalCostCents: 301,
      expiresOn: farFuture,
    })
    await receive(fx, {
      productId: fx.soda.id,
      warehouseId: fx.b.id,
      quantity: 3,
      totalCostCents: 500,
      expiresOn: farFuture,
    })
    const value = await getInventoryValue(fx.owner)
    expect(
      value.warehouses.map((row) => [row.name, row.units, row.valueCents]),
    ).toEqual([
      ['Almacén A', 13, 1301],
      ['Almacén B', 3, 500],
    ])
    expect(value.totalCents).toBe(1801)
  })

  test('rounds each partially sold lot to whole cents', async () => {
    const fx = await setupReports()
    // Unit cost 1000/3; after selling 1 piece, 2 left → 666.67 → 667.
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 3,
      totalCostCents: 1000,
      expiresOn: farFuture,
    })
    await fx.sell({ at: daysAgoAt(0), quantity: 1 })
    const value = await getInventoryValue(fx.owner)
    expect(value.warehouses[0]?.valueCents).toBe(667)
  })

  test('lots without stock add nothing', async () => {
    const fx = await setupReports()
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 2,
      totalCostCents: 400,
      expiresOn: farFuture,
    })
    await fx.sell({ at: daysAgoAt(0), quantity: 2 })
    const value = await getInventoryValue(fx.owner)
    expect(value.totalCents).toBe(0)
    expect(value.warehouses.map((row) => row.valueCents)).toEqual([0, 0])
  })

  test('refuses a manager', async () => {
    const fx = await setupReports()
    expect((await errorOf(() => getInventoryValue(fx.managerB))).code).toBe(
      'forbidden',
    )
  })
})

describe('non-moving capital', () => {
  async function stocked() {
    const fx = await setupReports()
    // Milk is sold; soda never is.
    await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 50,
      totalCostCents: 5000,
      expiresOn: farFuture,
    })
    await receive(fx, {
      productId: fx.soda.id,
      quantity: 10,
      totalCostCents: 9000,
      expiresOn: farFuture,
    })
    return fx
  }

  test('a product sold inside the window is excluded', async () => {
    const fx = await stocked()
    await fx.sell({ at: daysAgoAt(10), quantity: 1 })
    useClock(null)
    const result = await getNonMovingCapital(fx.owner)
    expect(result.days).toBe(30)
    expect(result.rows.map((row) => row.name)).toEqual(['Refresco 600ml'])
  })

  test('a sale exactly N days ago is still inside the window', async () => {
    const fx = await stocked()
    await fx.sell({ at: daysAgoAt(30), quantity: 1 })
    useClock(null)
    expect(
      (await getNonMovingCapital(fx.owner)).rows.map((row) => row.name),
    ).toEqual(['Refresco 600ml'])
  })

  test('a sale just outside the window is included with its age', async () => {
    const fx = await stocked()
    await fx.sell({ at: daysAgoAt(31), quantity: 1 })
    useClock(null)
    const rows = (await getNonMovingCapital(fx.owner)).rows
    expect(rows.map((row) => row.name)).toEqual([
      'Refresco 600ml',
      'Leche entera 1L',
    ])
    expect(rows[1]).toMatchObject({
      daysSinceLastSale: 31,
      lastSaleOn: addDays(businessDate(), -31),
      onHand: 49,
      valueCents: 4900,
    })
  })

  test('never sold is included with null days, sorted by value', async () => {
    const fx = await stocked()
    const { rows, totalCents } = await getNonMovingCapital(fx.owner)
    expect(rows.map((row) => [row.name, row.valueCents])).toEqual([
      ['Refresco 600ml', 9000],
      ['Leche entera 1L', 5000],
    ])
    expect(rows[0]).toMatchObject({
      daysSinceLastSale: null,
      lastSaleOn: null,
      warehouseName: 'Almacén A',
      onHand: 10,
    })
    expect(totalCents).toBe(14000)
  })

  test('longer windows keep fewer products', async () => {
    const fx = await stocked()
    await fx.sell({ at: daysAgoAt(45), quantity: 1 })
    useClock(null)
    expect(
      (await getNonMovingCapital(fx.owner, { days: 30 })).rows,
    ).toHaveLength(2)
    expect(
      (await getNonMovingCapital(fx.owner, { days: 60 })).rows.map(
        (row) => row.name,
      ),
    ).toEqual(['Refresco 600ml'])
  })

  test('rejects any N other than 30, 60 or 90', async () => {
    const fx = await stocked()
    for (const days of [0, 7, 45, 91, 30.5, Number.NaN]) {
      expect(
        (await errorOf(() => getNonMovingCapital(fx.owner, { days }))).code,
      ).toBe('invalid')
    }
  })

  test('refuses a manager', async () => {
    const fx = await stocked()
    expect((await errorOf(() => getNonMovingCapital(fx.managerB))).code).toBe(
      'forbidden',
    )
  })
})

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { updateProduct } from '#/modules/catalog/services/products'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { addDays } from '#/modules/reports/lib/period'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'
import {
  errorOf,
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'
import { businessDate } from '#/modules/orders/services/clock'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

const today = () => businessDate()

async function scenario() {
  const fx = await setupReports()
  // Milk: 20 on hand, minimum 50 → below minimum. Soda: 10 on hand, minimum 5.
  await receive(fx, {
    productId: fx.milk.id,
    quantity: 20,
    totalCostCents: 2000,
    expiresOn: farFuture,
  })
  await setMinimumStock(fx.owner, {
    productId: fx.milk.id,
    warehouseId: fx.a.id,
    minimum: 50,
  })
  await receive(fx, {
    productId: fx.soda.id,
    quantity: 10,
    expiresOn: farFuture,
  })
  await setMinimumStock(fx.owner, {
    productId: fx.soda.id,
    warehouseId: fx.a.id,
    minimum: 5,
  })
  // Expires in 3 days (inside 7), in 20 days (outside), and one already expired.
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 12,
    totalCostCents: 1200,
    lotCode: 'SOON',
    expiresOn: addDays(today(), 3),
  })
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 4,
    lotCode: 'LATER',
    expiresOn: addDays(today(), 20),
  })
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 6,
    totalCostCents: 301,
    lotCode: 'OLD',
    expiresOn: addDays(today(), -2),
  })
  // Another warehouse with its own shortage.
  await setMinimumStock(fx.owner, {
    productId: fx.soda.id,
    warehouseId: fx.b.id,
    minimum: 8,
  })
  return fx
}

describe('stock alerts', () => {
  test('low stock lists products whose available units are under the minimum', async () => {
    const fx = await scenario()
    const { lowStock } = await getStockAlerts(fx.owner, {})
    expect(
      lowStock.map((row) => [
        row.warehouseName,
        row.name,
        row.available,
        row.minimum,
      ]),
    ).toEqual([
      ['Almacén A', 'Leche 1L', 20, 50],
      ['Almacén B', 'Refresco 600ml', 0, 8],
    ])
    expect(lowStock[0]?.missing).toBe(30)
  })

  test('expiring lists lots ending within N days, soonest first, valued at cost', async () => {
    const fx = await scenario()
    const week = await getStockAlerts(fx.owner, { expiringDays: 7 })
    expect(
      week.expiring.map((row) => [row.lotCode, row.onHand, row.daysLeft]),
    ).toEqual([['SOON', 12, 3]])
    expect(week.expiring[0]).toMatchObject({
      warehouseName: 'Almacén A',
      expiresOn: addDays(today(), 3),
      valueCents: 1200,
    })
    const month = await getStockAlerts(fx.owner, { expiringDays: 30 })
    expect(month.expiring.map((row) => row.lotCode)).toEqual(['SOON', 'LATER'])
    // Default is 7 days.
    expect((await getStockAlerts(fx.owner, {})).expiring).toHaveLength(1)
  })

  test('expired units are listed with the cost of what is lost', async () => {
    const fx = await scenario()
    const { expired } = await getStockAlerts(fx.owner, {})
    expect(expired).toHaveLength(1)
    expect(expired[0]).toMatchObject({
      lotCode: 'OLD',
      onHand: 6,
      daysLeft: -2,
      valueCents: 301,
    })
  })

  test('counts are scoped to the manager’s warehouses only', async () => {
    const fx = await scenario()
    const own = await getStockAlerts(fx.managerB, {})
    expect(own.lowStock.map((row) => row.warehouseName)).toEqual(['Almacén B'])
    expect(own.expiring).toEqual([])
    expect(
      await errorOf(() =>
        getStockAlerts(fx.managerB, { warehouseIds: [fx.a.id] }),
      ),
    ).toMatchObject({ code: 'forbidden' })
  })

  test('rejects an expiring window that is not a positive number of days', async () => {
    const fx = await scenario()
    for (const expiringDays of [0, -1, 1.5, 4000]) {
      expect(
        await errorOf(() => getStockAlerts(fx.owner, { expiringDays })),
      ).toMatchObject({ code: 'invalid' })
    }
  })
})

describe('stock alerts by supplier', () => {
  test('low stock, expiring and expired only list the supplier’s products', async () => {
    const fx = await scenario()
    const lala = await createSupplier(fx.owner, { name: 'Lácteos Test' })
    const alpura = await createSupplier(fx.owner, { name: 'Bebidas Test' })
    await updateProduct(fx.owner, fx.milk.id, { supplierId: lala.id })
    await updateProduct(fx.owner, fx.milkBox.id, { supplierId: lala.id })
    await updateProduct(fx.owner, fx.soda.id, { supplierId: alpura.id })

    const mine = await getStockAlerts(fx.owner, { supplierId: lala.id })
    expect(mine.lowStock.map((row) => row.name)).toEqual(['Leche 1L'])
    expect(mine.expiring.map((row) => row.lotCode)).toEqual(['SOON'])
    expect(mine.expired.map((row) => row.lotCode)).toEqual(['OLD'])

    const theirs = await getStockAlerts(fx.owner, { supplierId: alpura.id })
    expect(theirs.lowStock.map((row) => row.name)).toEqual(['Refresco 600ml'])
    expect(theirs.expiring).toEqual([])
    expect(theirs.expired).toEqual([])
  })

  test('an unknown or malformed supplier id yields empty results', async () => {
    const fx = await scenario()
    for (const supplierId of [crypto.randomUUID(), 'nope']) {
      const alerts = await getStockAlerts(fx.owner, { supplierId })
      expect(alerts.lowStock).toEqual([])
      expect(alerts.expiring).toEqual([])
      expect(alerts.expired).toEqual([])
    }
  })
})

/**
 * Opt-in timing of what the owner dashboard (/reportes) and Inicio load, at
 * service level (the server functions only add auth). Skipped unless
 * `BENCH=1`; run against a scratch `*_test` database:
 *   BENCH=1 TEST_DATABASE_URL=postgresql://…/xyz_test bun test <this file>
 */
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createProduct } from '#/modules/catalog/services/products'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { getOverview } from '#/modules/overview/services/overview'
import { getCashCuts } from '#/modules/reports/services/cash-cuts'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import { getStockAlerts } from '#/modules/reports/services/stock-alerts'
import {
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'

const bench = process.env.BENCH === '1'
const period = { preset: '30' as const }

afterEach(() => useClock(null))

async function seed() {
  await resetDatabase(db)
  const fx = await setupReports()
  const warehouses = [fx.a, fx.b]
  for (let index = 0; index < 4; index += 1) {
    warehouses.push(
      await createWarehouse(fx.owner, { name: `Sucursal ${index}` }),
    )
  }
  const items = [fx.milkBox, fx.cola, fx.water]
  for (let index = 0; index < 60; index += 1) {
    items.push(
      await createProduct(fx.owner, {
        name: `Producto ${index}`,
        sku: `P-${index}`,
        category: 'Varios',
        unit: 'piezas',
        presentations: [{ name: 'Pieza', factor: 1 }],
        defaultIndex: 0,
      }),
    )
  }
  for (const warehouse of warehouses) {
    for (const [index, product] of items.entries()) {
      if (index % 2 === 0) {
        await receive(fx, {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 20 + index,
          totalCostCents: 5000,
          expiresOn: farFuture,
        })
      }
      await setMinimumStock(fx.owner, {
        productId: product.id,
        warehouseId: warehouse.id,
        minimum: 30,
      })
    }
  }
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 500,
    totalCostCents: 20_000,
    expiresOn: farFuture,
  })
  for (let day = 0; day < 30; day += 1) {
    await fx.sell({
      at: new Date(Date.now() - day * 86_400_000).toISOString(),
      quantity: 2,
    })
  }
  useClock(null)
  return fx
}

const time = async (label: string, run: () => Promise<unknown>) => {
  const samples: Array<number> = []
  for (let index = 0; index < 5; index += 1) {
    const start = performance.now()
    await run()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  const median = Math.round(samples[2])
  console.log(
    `BENCH ${label}: median ${median} ms (min ${Math.round(samples[0])})`,
  )
  return median
}

describe.skipIf(!bench)('dashboard loaders', () => {
  let fx: Awaited<ReturnType<typeof seed>>
  beforeAll(async () => {
    fx = await seed()
  }, 600_000)

  test('owner reports and Inicio', async () => {
    const ranking = await getWarehouseRanking(fx.owner, { period })
    const loader = async () => {
      await Promise.all([
        getMarginReport(fx.owner, { period }),
        getWarehouseRanking(fx.owner, { period }),
        getInventoryValue(fx.owner, {}),
        getNonMovingCapital(fx.owner, { days: 30 }),
        getSalesReport(fx.owner, { period }),
        getCashCuts(fx.owner, { period }),
        getStockAlerts(fx.owner, {}),
      ])
      await getSalesReport(fx.owner, {
        period: {
          preset: 'custom',
          from: ranking.previousRange.from,
          to: ranking.previousRange.to,
        },
      })
    }
    const reports = await time('owner /reportes loader', loader)
    const overview = await time('Inicio getOverview', () =>
      getOverview(fx.owner),
    )
    await time('getStockAlerts (6 warehouses)', () =>
      getStockAlerts(fx.owner, {}),
    )
    await time('getSalesReport', () => getSalesReport(fx.owner, { period }))
    expect(reports).toBeGreaterThan(0)
    expect(overview).toBeGreaterThan(0)
  }, 600_000)
})

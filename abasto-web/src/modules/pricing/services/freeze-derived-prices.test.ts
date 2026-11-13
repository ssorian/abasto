import { beforeEach, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { presentationPrices } from '#/modules/pricing/db/schema'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import { setPrices } from '#/modules/pricing/services/prices'
import { setupPricing } from '#/modules/pricing/services/testing'
import type { PricingFixture } from '#/modules/pricing/services/testing'

beforeEach(() => resetDatabase(db))

/** Runs the data migration again on the current test data. */
const freeze = async () =>
  db.execute(
    sql.raw(
      await Bun.file(
        new URL(
          '../../../../drizzle/0034_freeze_derived_prices.sql',
          import.meta.url,
        ),
      ).text(),
    ),
  )

const priceOf = async (fx: PricingFixture, warehouseId: string, id: string) =>
  (await listWarehousePrices(fx.owner, warehouseId)).find(
    (row) => row.presentationId === id,
  )

const historyRows = async () =>
  (await db.select().from(presentationPrices)).length

describe('freezing the derived prices', () => {
  test('a presentation without its own price gets the price it used to derive, rounded to the cent', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [
        { presentationId: fx.piece(fx.milkBox).id, priceCents: 1999 },
        // Default box of water: 1002 / 12 = 83.5 → 84 per piece.
        { presentationId: fx.box(fx.water).id, priceCents: 1002 },
      ],
    })
    await freeze()
    expect(await priceOf(fx, fx.a.id, fx.box(fx.milkBox).id)).toMatchObject({
      priceCents: 23988,
      origin: 'own',
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.water).id)).toMatchObject({
      priceCents: 84,
      origin: 'own',
    })
  })

  test('own prices, other warehouses and a second run are left alone', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [
        { presentationId: fx.piece(fx.cola).id, priceCents: 1850 },
        { presentationId: fx.box(fx.cola).id, priceCents: 40000 },
      ],
    })
    await freeze()
    expect(await historyRows()).toBe(2)
    expect((await priceOf(fx, fx.a.id, fx.box(fx.cola).id))?.priceCents).toBe(
      40000,
    )
    expect(
      (await priceOf(fx, fx.b.id, fx.box(fx.cola).id))?.priceCents,
    ).toBeNull()
    await freeze()
    expect(await historyRows()).toBe(2)
  })
})

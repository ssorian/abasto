import { beforeEach, describe, expect, test } from 'bun:test'
import { Client } from 'pg'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { bulkChangePrices } from '#/modules/pricing/services/bulk-prices'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  getPriceHistory,
  listWarehousePrices,
} from '#/modules/pricing/services/price-reads'
import {
  errorOf,
  pricingState,
  setupPricing,
} from '#/modules/pricing/services/testing'
import type { PricingFixture } from '#/modules/pricing/services/testing'

beforeEach(() => resetDatabase(db))

/** Resolves once another backend is waiting on an advisory lock. */
async function waitForAdvisoryWaiter(client: Client) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const { rows } = await client.query(
      "select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and wait_event = 'advisory'",
    )
    if (rows[0].n > 0) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('no backend waited on the advisory lock')
}

const priceOf = async (fx: PricingFixture, warehouseId: string, id: string) =>
  (await listWarehousePrices(fx.owner, warehouseId)).find(
    (row) => row.presentationId === id,
  )!.priceCents

/** Cola piece 1000 and milk piece 2000 in A; cola piece 1000 in B. */
async function priced() {
  const fx = await setupPricing()
  await setPrices(fx.owner, {
    warehouseId: fx.a.id,
    prices: [
      { presentationId: fx.piece(fx.cola).id, priceCents: 1000 },
      { presentationId: fx.piece(fx.milkBox).id, priceCents: 2000 },
    ],
  })
  await setPrices(fx.owner, {
    warehouseId: fx.b.id,
    prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1000 }],
  })
  return fx
}

describe('bulkChangePrices', () => {
  test('raises a supplier by a percentage and records it as bulk', async () => {
    const fx = await priced()
    const result = await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id],
      supplierId: fx.cocaCola.id,
      change: { kind: 'percent', bps: 500 },
      reason: 'Alza de Coca-Cola',
    })
    expect(result.changed).toBe(1)
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1050)
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.milkBox).id)).toBe(2000)
    expect(await priceOf(fx, fx.b.id, fx.piece(fx.cola).id)).toBe(1000)
    const [latest] = await getPriceHistory(fx.owner, {
      warehouseId: fx.a.id,
      presentationId: fx.piece(fx.cola).id,
    })
    expect(latest).toMatchObject({
      source: 'bulk',
      reason: 'Alza de Coca-Cola',
    })
  })

  test('filters by category and by explicit products', async () => {
    const fx = await priced()
    await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id],
      category: 'Lácteos',
      change: { kind: 'fixed', cents: 150 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.milkBox).id)).toBe(2150)
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1000)
    await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id],
      productIds: [fx.cola.id],
      change: { kind: 'fixed', cents: -100 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(900)
  })

  test('supplier and category filters combine (both must match)', async () => {
    const fx = await priced()
    const error = await errorOf(() =>
      bulkChangePrices(fx.owner, {
        warehouseIds: [fx.a.id],
        supplierId: fx.cocaCola.id,
        category: 'Lácteos',
        change: { kind: 'fixed', cents: 100 },
      }),
    )
    expect(error.message).toBe('No hay precios que cambiar con esa selección.')
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1000)
  })

  test('rounds percent results to the nearest cent', async () => {
    const fx = await priced()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1005 }],
    })
    // 1005 × 1.05 = 1055.25 → 1055
    await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id],
      supplierId: fx.cocaCola.id,
      change: { kind: 'percent', bps: 500 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1055)
    // 1055 × 0.995 = 1049.725 → 1050
    await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id],
      supplierId: fx.cocaCola.id,
      change: { kind: 'percent', bps: -50 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1050)
  })

  test('changes own prices only; derived ones follow the default', async () => {
    const fx = await priced()
    await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id],
      supplierId: fx.cocaCola.id,
      change: { kind: 'fixed', cents: 100 },
    })
    const box = (await listWarehousePrices(fx.owner, fx.a.id)).find(
      (row) => row.presentationId === fx.box(fx.cola).id,
    )
    expect(box).toMatchObject({ priceCents: 26400, origin: 'derived' })
  })

  test('applies to several warehouses, or to all the actor manages', async () => {
    const fx = await priced()
    await bulkChangePrices(fx.owner, {
      warehouseIds: [fx.a.id, fx.b.id],
      supplierId: fx.cocaCola.id,
      change: { kind: 'fixed', cents: 100 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1100)
    expect(await priceOf(fx, fx.b.id, fx.piece(fx.cola).id)).toBe(1100)
    await bulkChangePrices(fx.owner, {
      warehouseIds: 'all',
      supplierId: fx.cocaCola.id,
      change: { kind: 'fixed', cents: 100 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1200)
    expect(await priceOf(fx, fx.b.id, fx.piece(fx.cola).id)).toBe(1200)
  })

  test('"all" means only the warehouses a manager can manage', async () => {
    const fx = await priced()
    await bulkChangePrices(fx.managerA, {
      warehouseIds: 'all',
      supplierId: fx.cocaCola.id,
      change: { kind: 'fixed', cents: 100 },
    })
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1100)
    expect(await priceOf(fx, fx.b.id, fx.piece(fx.cola).id)).toBe(1000)
  })

  test('a result at or below zero rejects every warehouse', async () => {
    const fx = await priced()
    await setPrices(fx.owner, {
      warehouseId: fx.b.id,
      prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 100 }],
    })
    const before = await pricingState(fx)
    const error = await errorOf(() =>
      bulkChangePrices(fx.owner, {
        warehouseIds: [fx.a.id, fx.b.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'fixed', cents: -100 },
      }),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'El cambio deja un precio en cero o menos. No se cambió ningún precio.',
    ])
    expect(await pricingState(fx)).toEqual(before)
  })

  test('a manager who cannot manage one selected warehouse changes nothing', async () => {
    const fx = await priced()
    const before = await pricingState(fx)
    const error = await errorOf(() =>
      bulkChangePrices(fx.managerA, {
        warehouseIds: [fx.a.id, fx.b.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'fixed', cents: 100 },
      }),
    )
    expect([error.code, error.message]).toEqual([
      'forbidden',
      'No tienes permiso para esta acción.',
    ])
    expect(await pricingState(fx)).toEqual(before)
  })

  test('a clerk cannot change prices', async () => {
    const fx = await priced()
    const error = await errorOf(() =>
      bulkChangePrices(fx.clerkA, {
        warehouseIds: [fx.a.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'fixed', cents: 100 },
      }),
    )
    expect(error.code).toBe('forbidden')
  })

  const invalidCases: Array<
    [
      string,
      (fx: PricingFixture) => Parameters<typeof bulkChangePrices>[1],
      string,
      string,
    ]
  > = [
    [
      'no filter',
      (fx) => ({
        warehouseIds: [fx.a.id],
        change: { kind: 'fixed', cents: 100 },
      }),
      'invalid',
      'Elige un proveedor, una categoría o productos.',
    ],
    [
      'no warehouse',
      (fx) => ({
        warehouseIds: [],
        supplierId: fx.cocaCola.id,
        change: { kind: 'fixed', cents: 100 },
      }),
      'invalid',
      'Elige al menos un almacén.',
    ],
    [
      'a zero change',
      (fx) => ({
        warehouseIds: [fx.a.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'percent', bps: 0 },
      }),
      'invalid',
      'El cambio no puede ser cero.',
    ],
    [
      'a fractional amount',
      (fx) => ({
        warehouseIds: [fx.a.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'fixed', cents: 1.5 },
      }),
      'invalid',
      'El cambio debe ser un número entero.',
    ],
    [
      'a filter that matches no price',
      (fx) => ({
        warehouseIds: [fx.a.id],
        category: 'Botanas',
        change: { kind: 'fixed', cents: 100 },
      }),
      'not_found',
      'No hay precios que cambiar con esa selección.',
    ],
  ]
  for (const [name, input, code, message] of invalidCases) {
    test(`rejects ${name} and changes nothing`, async () => {
      const fx = await priced()
      const before = await pricingState(fx)
      const error = await errorOf(() => bulkChangePrices(fx.owner, input(fx)))
      expect([error.code, error.message]).toEqual([code, message])
      expect(await pricingState(fx)).toEqual(before)
    })
  }

  test('two concurrent +10% changes on the same price compose instead of overwriting', async () => {
    const fx = await priced()
    const raise = () =>
      bulkChangePrices(fx.owner, {
        warehouseIds: [fx.a.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'percent', bps: 1000 },
      })
    await Promise.all([raise(), raise()])
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1210)
  })

  test('a price saved while a bulk change waits for its lock is the base of that change', async () => {
    const fx = await priced()
    const blocker = new Client({ connectionString: process.env.DATABASE_URL })
    await blocker.connect()
    try {
      await blocker.query('begin')
      await blocker.query(
        'select pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`bulk-prices:${fx.a.id}`],
      )
      // The bulk change's transaction starts now and waits for the lock.
      const pending = bulkChangePrices(fx.owner, {
        warehouseIds: [fx.a.id],
        supplierId: fx.cocaCola.id,
        change: { kind: 'percent', bps: 1000 },
      })
      await waitForAdvisoryWaiter(blocker)
      await setPrices(fx.owner, {
        warehouseId: fx.a.id,
        prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 2000 }],
      })
      await blocker.query('commit')
      await pending
    } finally {
      await blocker.end()
    }
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(2200)
  })

  test('concurrent changes over several warehouses in opposite order do not deadlock', async () => {
    const fx = await priced()
    const raise = (warehouseIds: Array<string>) =>
      bulkChangePrices(fx.owner, {
        warehouseIds,
        supplierId: fx.cocaCola.id,
        change: { kind: 'percent', bps: 1000 },
      })
    await Promise.all([
      raise([fx.a.id, fx.b.id]),
      raise([fx.b.id, fx.a.id]),
      raise('all' as never),
    ])
    expect(await priceOf(fx, fx.a.id, fx.piece(fx.cola).id)).toBe(1331)
    expect(await priceOf(fx, fx.b.id, fx.piece(fx.cola).id)).toBe(1331)
  })
})

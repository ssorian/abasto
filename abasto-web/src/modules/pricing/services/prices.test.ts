import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { presentationPrices } from '#/modules/pricing/db/schema'
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

const forbidden = 'No tienes permiso para esta acción.'

const rowOf = async (fx: PricingFixture, warehouseId: string, id: string) =>
  (await listWarehousePrices(fx.owner, warehouseId)).find(
    (row) => row.presentationId === id,
  )!

describe('setPrices', () => {
  test('sets the own price of a presentation in one warehouse only', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1850 }],
    })
    const inA = await rowOf(fx, fx.a.id, fx.piece(fx.cola).id)
    expect(inA).toMatchObject({ priceCents: 1850, origin: 'own' })
    const inB = await rowOf(fx, fx.b.id, fx.piece(fx.cola).id)
    expect(inB).toMatchObject({ priceCents: null, origin: 'none' })
  })

  test('a new price keeps the old one in the history, newest first', async () => {
    const fx = await setupPricing()
    const presentationId = fx.piece(fx.cola).id
    for (const priceCents of [1850, 2000]) {
      await setPrices(fx.owner, {
        warehouseId: fx.a.id,
        prices: [{ presentationId, priceCents }],
        reason: 'Alza del proveedor',
      })
    }
    expect((await rowOf(fx, fx.a.id, presentationId)).priceCents).toBe(2000)
    const history = await getPriceHistory(fx.owner, {
      warehouseId: fx.a.id,
      presentationId,
    })
    expect(history.map((row) => row.priceCents)).toEqual([2000, 1850])
    expect(history[0]).toMatchObject({
      source: 'manual',
      reason: 'Alza del proveedor',
      createdBy: fx.owner.userId,
    })
  })

  test('history is scoped to its warehouse and presentation', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1850 }],
    })
    const other = await getPriceHistory(fx.owner, {
      warehouseId: fx.b.id,
      presentationId: fx.piece(fx.cola).id,
    })
    expect(other).toEqual([])
  })

  test('history rows cannot be updated or deleted', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1850 }],
    })
    await errorOf(async () => {
      await db.delete(presentationPrices)
    })
    await errorOf(async () => {
      await db.update(presentationPrices).set({ priceCents: 1 })
    })
    expect((await pricingState(fx)).history).toBe(1)
  })

  test('a presentation without its own price has no price, even when the default has one', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.milkBox).id, priceCents: 1999 }],
    })
    expect(await rowOf(fx, fx.a.id, fx.box(fx.milkBox).id)).toMatchObject({
      priceCents: null,
      origin: 'none',
    })
  })

  test('each presentation keeps its own price', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [
        { presentationId: fx.piece(fx.cola).id, priceCents: 1850 },
        { presentationId: fx.box(fx.cola).id, priceCents: 40000 },
      ],
    })
    expect(await rowOf(fx, fx.a.id, fx.box(fx.cola).id)).toMatchObject({
      priceCents: 40000,
      origin: 'own',
    })
  })

  test('a presentation without default price has no price', async () => {
    const fx = await setupPricing()
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.box(fx.cola).id, priceCents: 40000 }],
    })
    expect(await rowOf(fx, fx.a.id, fx.piece(fx.cola).id)).toMatchObject({
      priceCents: null,
      origin: 'none',
    })
  })

  test('a manager prices their warehouse; the manager of another one cannot', async () => {
    const fx = await setupPricing()
    const presentationId = fx.piece(fx.cola).id
    await setPrices(fx.managerA, {
      warehouseId: fx.a.id,
      prices: [{ presentationId, priceCents: 1850 }],
    })
    const read = await listWarehousePrices(fx.managerA, fx.a.id)
    await expect(
      read.find((row) => row.presentationId === presentationId),
    ).toMatchObject({
      priceCents: 1850,
    })
    const error = await errorOf(() =>
      setPrices(fx.managerB, {
        warehouseId: fx.a.id,
        prices: [{ presentationId, priceCents: 1 }],
      }),
    )
    expect([error.code, error.message]).toEqual(['forbidden', forbidden])
  })

  test('a manager of A cannot price or read B', async () => {
    const fx = await setupPricing()
    const before = await pricingState(fx)
    const write = await errorOf(() =>
      setPrices(fx.managerA, {
        warehouseId: fx.b.id,
        prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1850 }],
      }),
    )
    expect([write.code, write.message]).toEqual(['forbidden', forbidden])
    const read = await errorOf(() => listWarehousePrices(fx.managerA, fx.b.id))
    expect(read.code).toBe('forbidden')
    const history = await errorOf(() =>
      getPriceHistory(fx.managerA, {
        warehouseId: fx.b.id,
        presentationId: fx.piece(fx.cola).id,
      }),
    )
    expect(history.code).toBe('forbidden')
    expect(await pricingState(fx)).toEqual(before)
  })

  const invalidCases: Array<
    [
      string,
      (fx: PricingFixture) => Parameters<typeof setPrices>[1],
      string,
      string,
    ]
  > = [
    [
      'a zero price',
      (fx) => ({
        warehouseId: fx.a.id,
        prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 0 }],
      }),
      'invalid',
      'El precio debe ser mayor que cero.',
    ],
    [
      'a fractional price',
      (fx) => ({
        warehouseId: fx.a.id,
        prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 10.5 }],
      }),
      'invalid',
      'El precio debe ser mayor que cero.',
    ],
    [
      'an empty list',
      (fx) => ({ warehouseId: fx.a.id, prices: [] }),
      'invalid',
      'Indica al menos un precio.',
    ],
    [
      'a repeated presentation',
      (fx) => ({
        warehouseId: fx.a.id,
        prices: [
          { presentationId: fx.piece(fx.cola).id, priceCents: 100 },
          { presentationId: fx.piece(fx.cola).id, priceCents: 200 },
        ],
      }),
      'invalid',
      'Una presentación aparece más de una vez.',
    ],
    [
      'an unknown presentation',
      (fx) => ({
        warehouseId: fx.a.id,
        prices: [
          { presentationId: fx.piece(fx.cola).id, priceCents: 100 },
          {
            presentationId: '00000000-0000-4000-8000-000000000000',
            priceCents: 100,
          },
        ],
      }),
      'not_found',
      'No encontramos esa presentación.',
    ],
    [
      'an unknown warehouse',
      (fx) => ({
        warehouseId: '00000000-0000-4000-8000-000000000000',
        prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 100 }],
      }),
      'not_found',
      'No encontramos ese almacén.',
    ],
  ]
  for (const [name, input, code, message] of invalidCases) {
    test(`rejects ${name} and changes nothing`, async () => {
      const fx = await setupPricing()
      await setPrices(fx.owner, {
        warehouseId: fx.a.id,
        prices: [{ presentationId: fx.piece(fx.cola).id, priceCents: 1850 }],
      })
      const before = await pricingState(fx)
      const error = await errorOf(() => setPrices(fx.owner, input(fx)))
      expect([error.code, error.message]).toEqual([code, message])
      expect(await pricingState(fx)).toEqual(before)
    })
  }
})

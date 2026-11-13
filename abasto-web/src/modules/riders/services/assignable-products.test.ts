import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { assignRider } from '#/modules/riders/services/assignments'
import { listAssignableProducts } from '#/modules/riders/services/assignable-products'
import {
  errorOf,
  receive,
  setupRiders,
} from '#/modules/riders/services/testing'

beforeEach(() => resetDatabase(db))

describe('listAssignableProducts', () => {
  test('lists products with free stock and their box factor', async () => {
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const listed = await listAssignableProducts(fx.staffA, fx.a.id)
    expect(listed).toEqual([
      {
        productId: fx.milkBox.id,
        name: expect.any(String),
        sku: fx.milkBox.sku,
        boxFactor: 12,
        available: 100,
      },
    ])
  })

  test('leaves out units already handed to a rider, and exhausted products', async () => {
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    await assignRider(fx.staffA, {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 2, units: 4 }],
    })
    expect(
      (await listAssignableProducts(fx.staffA, fx.a.id))[0].available,
    ).toBe(72)
    await assignRider(fx.staffA, {
      riderId: fx.other.id,
      lines: [{ productId: fx.milkBox.id, units: 72 }],
    })
    expect(await listAssignableProducts(fx.staffA, fx.a.id)).toEqual([])
  })

  test('refuses a warehouse the actor cannot see', async () => {
    const fx = await setupRiders()
    expect(
      (await errorOf(() => listAssignableProducts(fx.staffA, fx.b.id))).code,
    ).toBe('forbidden')
  })
})

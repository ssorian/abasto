import { beforeEach, describe, expect, test } from 'bun:test'
import { count } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { presentationPrices } from '#/modules/pricing/db/schema'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import {
  createProduct,
  listProducts,
} from '#/modules/catalog/services/products'
import { errorOf, setupInventory } from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const newProduct = {
  name: 'Agua 1L',
  sku: 'AGU-1',
  category: 'Refrescos',
  unit: 'piezas',
  presentations: [
    { name: 'Pieza', factor: 1 },
    { name: 'Caja x12', factor: 12 },
  ],
  defaultIndex: 1,
}

const priceRows = async () =>
  (await db.select({ value: count() }).from(presentationPrices))[0]?.value

describe('createProduct with cost and price', () => {
  test('stores the product, its cost and the price of the default presentation', async () => {
    const fx = await setupInventory()
    const before = (await listProducts(fx.owner)).length
    const created = await createProduct(fx.owner, {
      ...newProduct,
      listPricePerPiece: 125_000,
      fixedDiscountPerPiece: 5_000,
      promotionPerPiece: 2_500,
      price: { warehouseId: fx.a.id, priceCents: 21_000 },
    })
    expect(created).toMatchObject({
      listPricePerPiece: 125_000,
      fixedDiscountPerPiece: 5_000,
      promotionPerPiece: 2_500,
    })
    expect((await listProducts(fx.owner)).length).toBe(before + 1)
    const row = (await listWarehousePrices(fx.owner, fx.a.id)).find(
      (item) => item.presentationId === created.presentations[1]?.id,
    )
    expect(row).toMatchObject({ priceCents: 21_000, origin: 'own' })
    expect(created.presentations[1]?.isDefault).toBe(true)
  })

  test.each([
    [
      'discount plus promotion above the cost',
      { fixedDiscountPerPiece: 90_000, promotionPerPiece: 20_000 },
      21_000,
    ],
    ['a negative price', {}, -100],
    ['a price of zero', {}, 0],
  ])('rejects %s and saves nothing', async (_name, extra, priceCents) => {
    const fx = await setupInventory()
    const before = (await listProducts(fx.owner)).length
    const error = await errorOf(() =>
      createProduct(fx.owner, {
        ...newProduct,
        listPricePerPiece: 100_000,
        ...extra,
        price: { warehouseId: fx.a.id, priceCents },
      }),
    )
    expect(error.code).toBe('invalid')
    expect((await listProducts(fx.owner)).length).toBe(before)
    expect(await priceRows()).toBe(0)
  })

  test('rolls back the product when the warehouse does not exist', async () => {
    const fx = await setupInventory()
    const before = (await listProducts(fx.owner)).length
    const error = await errorOf(() =>
      createProduct(fx.owner, {
        ...newProduct,
        listPricePerPiece: 100_000,
        price: {
          warehouseId: '00000000-0000-4000-8000-000000000000',
          priceCents: 21_000,
        },
      }),
    )
    expect(error.code).toBe('not_found')
    expect((await listProducts(fx.owner)).length).toBe(before)
    expect(await priceRows()).toBe(0)
  })

  const boxFirst = {
    ...newProduct,
    presentations: [
      { name: 'Caja x12', factor: 12 },
      { name: 'Pieza', factor: 1 },
    ],
    defaultIndex: 0,
    listPricePerPiece: 100_000,
  }

  test('stores one price per presentation, matched by its position in the form', async () => {
    const fx = await setupInventory()
    const created = await createProduct(fx.owner, {
      ...boxFirst,
      prices: { warehouseId: fx.a.id, cents: [13_000, 1_200] },
    })
    const stored = await listWarehousePrices(fx.owner, fx.a.id)
    const priceOf = (name: string) =>
      stored.find(
        (item) =>
          item.presentationId ===
          created.presentations.find((row) => row.name === name)?.id,
      )?.priceCents
    expect(priceOf('Caja x12')).toBe(13_000)
    expect(priceOf('Pieza')).toBe(1_200)
    expect(await priceRows()).toBe(2)
  })

  test('a blank position saves no price for that presentation', async () => {
    const fx = await setupInventory()
    await createProduct(fx.owner, {
      ...boxFirst,
      prices: { warehouseId: fx.a.id, cents: [13_000, null] },
    })
    expect(await priceRows()).toBe(1)
  })

  test.each([
    ['a price of zero in any position', [13_000, 0]],
    ['more prices than presentations', [13_000, 1_200, 500]],
  ])('rejects %s and saves nothing', async (_name, cents) => {
    const fx = await setupInventory()
    const before = (await listProducts(fx.owner)).length
    const error = await errorOf(() =>
      createProduct(fx.owner, {
        ...boxFirst,
        prices: { warehouseId: fx.a.id, cents },
      }),
    )
    expect(error.code).toBe('invalid')
    expect((await listProducts(fx.owner)).length).toBe(before)
    expect(await priceRows()).toBe(0)
  })

  test('creates with a cost and no price when there is no warehouse', async () => {
    const fx = await setupInventory()
    const created = await createProduct(fx.owner, {
      ...newProduct,
      listPricePerPiece: 100_000,
    })
    expect(created.listPricePerPiece).toBe(100_000)
    expect(await priceRows()).toBe(0)
  })
})

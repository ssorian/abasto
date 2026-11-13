import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { products } from '#/modules/catalog/db/schema'
import { stockMinimums } from '#/modules/inventory/db/schema'
import { presentationPrices } from '#/modules/pricing/db/schema'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import { importProducts } from '#/modules/product-import/services/import-products'
import { errorOf, setupPricing } from '#/modules/pricing/services/testing'
import type { ImportProductRow } from '#/modules/product-import/services/import-products'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

const row = (change: Partial<ImportProductRow> = {}): ImportProductRow => ({
  product: {
    sku: 'NUE-001',
    name: 'Producto nuevo',
    description: 'Desc',
    category: 'Abarrotes',
    unit: 'piezas',
    published: true,
    presentations: [
      { name: 'piezas', factor: 1, barcode: null, active: true },
      { name: 'Caja', factor: 12, barcode: '7500000000001', active: true },
    ],
    defaultIndex: 1,
  },
  priceCents: 24000,
  minimum: 24,
  ...change,
})

const stored = async () => ({
  products: (await db.select().from(products)).map(({ sku }) => sku).sort(),
  prices: (await db.select().from(presentationPrices)).length,
  minimums: await db.select().from(stockMinimums),
})

describe('importProducts', () => {
  test('saves the price of the main presentation and the minimum stock in the chosen warehouse only', async () => {
    const fx = await setupPricing()
    const before = await stored()
    const results = await importProducts(fx.owner, {
      warehouseId: fx.a.id,
      rows: [row()],
    })
    expect(results).toEqual([{ sku: 'NUE-001', error: null }])

    const [created] = await db
      .select()
      .from(products)
      .where(eq(products.sku, 'NUE-001'))
    const box = (await listWarehousePrices(fx.owner, fx.a.id)).find(
      (item) => item.productId === created.id && item.isDefault,
    )!
    expect(box).toMatchObject({ priceCents: 24000, origin: 'own' })
    const inB = (await listWarehousePrices(fx.owner, fx.b.id)).find(
      (item) => item.productId === created.id && item.isDefault,
    )!
    expect(inB.priceCents).toBeNull()

    const after = await stored()
    expect(after.products).toEqual([...before.products, 'NUE-001'].sort())
    expect(after.prices).toBe(before.prices + 1)
    expect(after.minimums).toEqual([
      { productId: created.id, warehouseId: fx.a.id, minimum: 24 },
    ])
  })

  test('a row the server rejects reports its message and leaves no product, price or minimum', async () => {
    const fx = await setupPricing()
    const results = await importProducts(fx.owner, {
      warehouseId: fx.a.id,
      rows: [
        row({ product: { ...row().product, sku: 'LEC-1' } }),
        row({ product: { ...row().product, sku: 'OK-1' } }),
        row({ product: { ...row().product, sku: 'BAD-1' }, priceCents: 0 }),
        row({
          product: { ...row().product, sku: 'BIG-1' },
          priceCents: 2147483648,
        }),
      ],
    })
    expect(results).toEqual([
      { sku: 'LEC-1', error: 'El SKU ya existe.' },
      { sku: 'OK-1', error: null },
      { sku: 'BAD-1', error: 'El precio debe ser mayor que cero.' },
      { sku: 'BIG-1', error: 'El precio es demasiado grande.' },
    ])
    const after = await stored()
    expect(after.products).toContain('OK-1')
    expect(after.products).not.toContain('BAD-1')
    expect(after.prices).toBe(1)
    expect(after.minimums).toHaveLength(1)
  })

  test('a zero minimum stores no minimum row', async () => {
    const fx = await setupPricing()
    await importProducts(fx.owner, {
      warehouseId: fx.a.id,
      rows: [row({ minimum: 0 })],
    })
    expect(await db.select().from(stockMinimums)).toEqual([])
  })

  test('a manager imports only into a managed warehouse; a refused import stores nothing', async () => {
    const fx = await setupPricing()
    const before = await stored()
    const error = await errorOf(() =>
      importProducts(fx.managerB, { warehouseId: fx.a.id, rows: [row()] }),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect(await stored()).toEqual(before)
    const results = await importProducts(fx.managerA, {
      warehouseId: fx.a.id,
      rows: [row()],
    })
    expect(results).toHaveLength(1)
    expect(await stored()).not.toEqual(before)
  })

  test('an unknown warehouse is refused before any row is written', async () => {
    const fx = await setupPricing()
    const before = await stored()
    const error = await errorOf(() =>
      importProducts(fx.owner, {
        warehouseId: '00000000-0000-4000-8000-000000000000',
        rows: [row()],
      }),
    )
    expect(error.code).toBe('not_found')
    expect(await stored()).toEqual(before)
  })
})

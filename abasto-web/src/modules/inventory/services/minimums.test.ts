import { beforeEach, describe, expect, test } from 'bun:test'
import { count } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { stockMinimums } from '#/modules/inventory/db/schema'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import {
  errorOf,
  receive,
  setupInventory,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'
const rows = async () =>
  (await db.select({ value: count() }).from(stockMinimums))[0]?.value

describe('setMinimumStock', () => {
  test('sets and then updates the minimum per product and warehouse', async () => {
    const fx = await setupInventory()
    await setMinimumStock(fx.managerA, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      minimum: 20,
    })
    await setMinimumStock(fx.managerA, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      minimum: 30,
    })
    await setMinimumStock(fx.managerB, {
      productId: fx.milk.id,
      warehouseId: fx.b.id,
      minimum: 5,
    })
    expect(await rows()).toBe(2)
    const [row] = await getWarehouseStock(fx.managerA, fx.a.id)
    expect(row).toMatchObject({
      productId: fx.milk.id,
      minimum: 30,
      onHand: 0,
      belowMinimum: true,
    })
  })

  test('rejects a negative or fractional minimum', async () => {
    const fx = await setupInventory()
    for (const minimum of [-1, 1.5]) {
      const error = await errorOf(() =>
        setMinimumStock(fx.owner, {
          productId: fx.milk.id,
          warehouseId: fx.a.id,
          minimum,
        }),
      )
      expect(error.code).toBe('invalid')
      expect(error.message).toBe('El mínimo debe ser cero o mayor.')
    }
    expect(await rows()).toBe(0)
  })

  test('rejects an unknown product or warehouse', async () => {
    const fx = await setupInventory()
    const product = await errorOf(() =>
      setMinimumStock(fx.owner, {
        productId: crypto.randomUUID(),
        warehouseId: fx.a.id,
        minimum: 1,
      }),
    )
    expect([product.code, product.message]).toEqual([
      'not_found',
      'No encontramos ese producto.',
    ])
    const warehouse = await errorOf(() =>
      setMinimumStock(fx.owner, {
        productId: fx.milk.id,
        warehouseId: crypto.randomUUID(),
        minimum: 1,
      }),
    )
    expect([warehouse.code, warehouse.message]).toEqual([
      'not_found',
      'No encontramos ese almacén.',
    ])
    expect(await rows()).toBe(0)
  })

  test('a manager of another warehouse cannot set it', async () => {
    const fx = await setupInventory()
    for (const actor of [fx.managerB]) {
      const error = await errorOf(() =>
        setMinimumStock(actor, {
          productId: fx.milk.id,
          warehouseId: fx.a.id,
          minimum: 1,
        }),
      )
      expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    }
    expect(await rows()).toBe(0)
  })

  test('receiving stock clears the below-minimum flag', async () => {
    const fx = await setupInventory()
    await setMinimumStock(fx.owner, {
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      minimum: 10,
    })
    await receive(fx, { quantity: 10 })
    const [row] = await getWarehouseStock(fx.owner, fx.a.id)
    expect(row.belowMinimum).toBe(false)
  })
})

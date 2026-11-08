import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import { createProduct } from '#/modules/catalog/services/products'
import { createPurchase } from '#/modules/inventory/services/purchases'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import {
  errorOf,
  inventoryState,
  ledgerSum,
  setupInventory,
} from '#/modules/inventory/services/testing'
import type { Fixture } from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

const purchaseOf = (fx: Fixture, overrides: Record<string, unknown> = {}) => ({
  supplierId: fx.supplier.id,
  warehouseId: fx.a.id,
  reference: 'F-100',
  purchasedOn: '2026-11-01',
  lines: [
    {
      productId: fx.milk.id,
      quantity: 24,
      totalCostCents: 50000,
      lotCode: 'L-1',
      expiresOn: '2026-12-01',
    },
    { productId: fx.soda.id, quantity: 10, totalCostCents: 7001 },
  ],
  ...overrides,
})

async function rejects(
  fx: Fixture,
  input: ReturnType<typeof purchaseOf>,
  code: AppErrorCode,
  message: string,
) {
  const before = await inventoryState()
  const error = await errorOf(() => createPurchase(fx.owner, input))
  expect(error.code).toBe(code)
  expect(error.message).toBe(message)
  expect(await inventoryState()).toEqual(before)
}

describe('createPurchase', () => {
  test('creates one lot and one ledger movement per line, in base units and cents', async () => {
    const fx = await setupInventory()
    const created = await createPurchase(fx.managerA, purchaseOf(fx))
    expect(created.lots).toHaveLength(2)
    const [milkLot, sodaLot] = created.lots
    expect(milkLot).toMatchObject({
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      code: 'L-1',
      expiresOn: '2026-12-01',
      receivedQuantity: 24,
      receivedCostCents: 50000,
      onHand: 24,
    })
    expect(sodaLot).toMatchObject({
      onHand: 10,
      receivedCostCents: 7001,
      expiresOn: null,
    })
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.lotId, milkLot.id))
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      type: 'purchase',
      quantity: 24,
      reference: created.id,
      actorId: fx.managerA.userId,
    })
    expect(await ledgerSum(sodaLot.id)).toBe(10)
    const stock = await getWarehouseStock(fx.managerA, fx.a.id)
    expect(stock.map((row) => row.onHand).sort()).toEqual([10, 24])
  })

  test('the owner can buy for any warehouse', async () => {
    const fx = await setupInventory()
    const created = await createPurchase(
      fx.owner,
      purchaseOf(fx, { warehouseId: fx.b.id }),
    )
    expect(created.lots[0].warehouseId).toBe(fx.b.id)
  })

  test('manager of A cannot purchase in B', async () => {
    const fx = await setupInventory()
    const before = await inventoryState()
    for (const [actor, warehouseId] of [[fx.managerA, fx.b.id]] as const) {
      const error = await errorOf(() =>
        createPurchase(actor, purchaseOf(fx, { warehouseId })),
      )
      expect(error.code).toBe('forbidden')
      expect(error.message).toBe(forbidden)
    }
    expect(await inventoryState()).toEqual(before)
  })

  test('rejects an unknown supplier', async () => {
    const fx = await setupInventory()
    await rejects(
      fx,
      purchaseOf(fx, { supplierId: crypto.randomUUID() }),
      'not_found',
      'No encontramos ese proveedor.',
    )
  })

  test('rejects an unknown warehouse', async () => {
    const fx = await setupInventory()
    await rejects(
      fx,
      purchaseOf(fx, { warehouseId: crypto.randomUUID() }),
      'not_found',
      'No encontramos ese almacén.',
    )
  })

  test('an unknown product in the last line leaves no partial purchase', async () => {
    const fx = await setupInventory()
    const input = purchaseOf(fx)
    input.lines.push({
      productId: crypto.randomUUID(),
      quantity: 1,
      totalCostCents: 1,
    })
    await rejects(fx, input, 'not_found', 'No encontramos ese producto.')
  })

  test('rejects a purchase without lines', async () => {
    const fx = await setupInventory()
    await rejects(
      fx,
      purchaseOf(fx, { lines: [] }),
      'invalid',
      'Agrega al menos un producto a la compra.',
    )
  })

  test.each([0, -3, 1.5])('rejects quantity %p', async (quantity) => {
    const fx = await setupInventory()
    await rejects(
      fx,
      purchaseOf(fx, {
        lines: [{ productId: fx.milk.id, quantity, totalCostCents: 100 }],
      }),
      'invalid',
      'La cantidad debe ser mayor que cero.',
    )
  })

  test.each([-1, 2.5])('rejects cost %p', async (totalCostCents) => {
    const fx = await setupInventory()
    await rejects(
      fx,
      purchaseOf(fx, {
        lines: [{ productId: fx.milk.id, quantity: 1, totalCostCents }],
      }),
      'invalid',
      'El costo debe ser un monto en centavos de cero o más.',
    )
  })

  test('rejects an invalid expiry or purchase date', async () => {
    const fx = await setupInventory()
    await rejects(
      fx,
      purchaseOf(fx, {
        lines: [
          {
            productId: fx.milk.id,
            quantity: 1,
            totalCostCents: 1,
            expiresOn: '31/12/2026',
          },
        ],
      }),
      'invalid',
      'La fecha de caducidad no es válida.',
    )
    await rejects(
      fx,
      purchaseOf(fx, { purchasedOn: '2026-13-40' }),
      'invalid',
      'La fecha de la compra no es válida.',
    )
  })

  test('a zero-cost line is allowed', async () => {
    const fx = await setupInventory()
    const created = await createPurchase(
      fx.owner,
      purchaseOf(fx, {
        lines: [{ productId: fx.milk.id, quantity: 5, totalCostCents: 0 }],
      }),
    )
    const [lot] = await db
      .select()
      .from(lots)
      .where(eq(lots.id, created.lots[0].id))
    expect(lot.receivedCostCents).toBe(0)
  })
})

describe('createPurchase sale price per box', () => {
  const boxedMilk = (fx: Fixture) =>
    createProduct(fx.owner, {
      name: 'Leche caja',
      sku: 'LEC-CAJA',
      category: 'Lácteos',
      unit: 'piezas',
      presentations: [
        { name: 'Pieza', factor: 1 },
        { name: 'Caja', factor: 12 },
      ],
      defaultIndex: 1,
    })

  /** Two boxes of 12 for $60.00: the cost per box is $30.00. */
  const twoBoxes = (productId: string, salePriceCents?: number) => ({
    productId,
    quantity: 24,
    totalCostCents: 6000,
    ...(salePriceCents === undefined ? {} : { salePriceCents }),
  })

  test.each([3400, 3000])(
    'stores sale price %p on the lot when it is not below the cost per box',
    async (salePriceCents) => {
      const fx = await setupInventory()
      const product = await boxedMilk(fx)
      const created = await createPurchase(
        fx.owner,
        purchaseOf(fx, { lines: [twoBoxes(product.id, salePriceCents)] }),
      )
      const [lot] = await db
        .select()
        .from(lots)
        .where(eq(lots.id, created.lots[0].id))
      expect(lot.salePriceCents).toBe(salePriceCents)
      expect(created.lots[0].salePriceCents).toBe(salePriceCents)
    },
  )

  test('a line without a sale price leaves the lot on the standard price', async () => {
    const fx = await setupInventory()
    const product = await boxedMilk(fx)
    const created = await createPurchase(
      fx.owner,
      purchaseOf(fx, { lines: [twoBoxes(product.id)] }),
    )
    expect(created.lots[0].salePriceCents).toBeNull()
  })

  test('rejects a sale price below the cost per box', async () => {
    const fx = await setupInventory()
    const product = await boxedMilk(fx)
    await rejects(
      fx,
      purchaseOf(fx, { lines: [twoBoxes(product.id, 2999)] }),
      'invalid',
      'El precio de salida no puede ser menor que el costo por caja.',
    )
  })

  test.each([0, -100, 34.5])(
    'rejects sale price %p',
    async (salePriceCents) => {
      const fx = await setupInventory()
      const product = await boxedMilk(fx)
      await rejects(
        fx,
        purchaseOf(fx, { lines: [twoBoxes(product.id, salePriceCents)] }),
        'invalid',
        'El precio de salida debe ser un monto en centavos mayor que cero.',
      )
    },
  )
})

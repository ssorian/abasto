import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { savePresentations } from '#/modules/catalog/services/presentations'
import {
  lots,
  stockMovements,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import {
  createSupplierOrder,
  getSupplierOrder,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  listSupplierPendings,
  writeOffPendings,
} from '#/modules/inventory/services/supplier-pendings'
import {
  errorOf,
  lineFor,
  setupSupplierOrders,
  supplierState,
} from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

/** Orders milk, then receives `good`/`damaged` of it (plus replacements). */
async function receiveMilk(
  fx: SupplierFixture,
  boxes: number,
  good: number,
  damaged: number,
  replacements?: Array<{ productId: string; boxes: number }>,
  listPricePerPiece?: number,
) {
  const created = await createSupplierOrder(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId: fx.a.id,
    lines: [lineFor(fx.milk, boxes, listPricePerPiece)],
  })
  const order = await getSupplierOrder(fx.owner, created.id)
  return receiveSupplierOrder(fx.owner, {
    purchaseId: order.id,
    lines: [
      { lineId: order.lines[0].id, goodBoxes: good, damagedBoxes: damaged },
    ],
    replacements,
  })
}

const owedMilk = async (fx: SupplierFixture) => {
  const { owed } = await listSupplierPendings(fx.owner, fx.supplier.id)
  return owed.find((row) => row.productId === fx.milk.id)
}

describe('listSupplierPendings', () => {
  test('shows owed boxes and value per product with the history', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    const view = await listSupplierPendings(fx.managerA, fx.supplier.id)
    expect(view.owed).toHaveLength(1)
    expect(view.owed[0]).toMatchObject({
      supplierId: fx.supplier.id,
      supplierName: 'Alpura',
      productId: fx.milk.id,
      boxFactor: 12,
      owedQuantity: 60,
      owedBoxes: 5,
      owedValueCents: 6720,
    })
    expect(view.history.map((row) => [row.type, row.quantity]).sort()).toEqual([
      ['damaged', 24],
      ['missing', 36],
    ])
    const other = await listSupplierPendings(fx.owner, fx.cocaCola.id)
    expect(other).toEqual({ owed: [], history: [] })
    const all = await listSupplierPendings(fx.owner)
    expect(all.owed).toHaveLength(1)
  })

  test('requires owner or a warehouse manager', async () => {
    const fx = await setupSupplierOrders()
    const error = await errorOf(() => listSupplierPendings(fx.clerkA))
    expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    await listSupplierPendings(fx.managerB)
  })
})

describe('replacements', () => {
  test('replaced boxes enter as a lot at the original cost per box', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    // The next order is priced at 2304 per box (above the 2000 standard price).
    const result = await receiveMilk(
      fx,
      4,
      4,
      0,
      [{ productId: fx.milk.id, boxes: 2 }],
      20000,
    )
    expect(result.lots[0]).toMatchObject({
      receivedCostCents: 9216,
      salePriceCents: null,
    })
    expect(result.replacementLots).toHaveLength(1)
    expect(result.replacementLots[0]).toMatchObject({
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      receivedQuantity: 24,
      receivedCostCents: 2688,
      salePriceCents: 2000,
      onHand: 24,
    })
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.lotId, result.replacementLots[0].id))
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({ type: 'purchase', quantity: 24 })
    const replaced = (
      await db
        .select()
        .from(supplierPendings)
        .where(eq(supplierPendings.type, 'replaced'))
    )[0]
    expect(replaced).toMatchObject({
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      quantity: -24,
      valueCents: -2688,
    })
    expect(await owedMilk(fx)).toMatchObject({
      owedQuantity: 36,
      owedBoxes: 3,
      owedValueCents: 4032,
    })
  })

  test('values replacements with the oldest owed entries first', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 6, 1, 0) // 5 boxes missing at 1344
    await receiveMilk(fx, 4, 0, 2, undefined, 20000) // 2 damaged + 2 missing at 2304
    expect(await owedMilk(fx)).toMatchObject({
      owedBoxes: 9,
      owedValueCents: 6720 + 4 * 2304,
    })
    await receiveMilk(fx, 1, 1, 0, [{ productId: fx.milk.id, boxes: 6 }])
    const replaced = await db
      .select()
      .from(supplierPendings)
      .where(eq(supplierPendings.type, 'replaced'))
    expect(replaced[0]).toMatchObject({
      quantity: -72,
      valueCents: -(6720 + 2304),
    })
    expect(await owedMilk(fx)).toMatchObject({
      owedBoxes: 3,
      owedValueCents: 3 * 2304,
    })
  })

  test('rejects bad replacements and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2) // 5 owed
    const created = await createSupplierOrder(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.milk, 1)],
    })
    const order = await getSupplierOrder(fx.owner, created.id)
    const lines = [{ lineId: order.lines[0].id, goodBoxes: 1, damagedBoxes: 0 }]
    const cases: Array<
      [Array<{ productId: string; boxes: number }>, AppErrorCode, string]
    > = [
      [
        [{ productId: fx.milk.id, boxes: 6 }],
        'invalid',
        'Las cajas de reposición superan el saldo del proveedor.',
      ],
      [
        [{ productId: fx.soda.id, boxes: 1 }],
        'invalid',
        'Las cajas de reposición superan el saldo del proveedor.',
      ],
      [
        [{ productId: fx.milk.id, boxes: 0 }],
        'invalid',
        'Las cajas de reposición deben ser un número entero mayor que cero.',
      ],
      [
        [
          { productId: fx.milk.id, boxes: 1 },
          { productId: fx.milk.id, boxes: 1 },
        ],
        'invalid',
        'Cada producto solo puede aparecer una vez en la reposición.',
      ],
    ]
    for (const [replacements, code, message] of cases) {
      const before = await supplierState()
      const error = await errorOf(() =>
        receiveSupplierOrder(fx.owner, {
          purchaseId: order.id,
          lines,
          replacements,
        }),
      )
      expect([error.code, error.message]).toEqual([code, message])
      expect(await supplierState()).toEqual(before)
    }
  })

  test("another supplier's pendings cannot be replaced by this order", async () => {
    const fx = await setupSupplierOrders()
    const colaOrder = await createSupplierOrder(fx.owner, {
      supplierId: fx.cocaCola.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.cola, 2)],
    })
    const order = await getSupplierOrder(fx.owner, colaOrder.id)
    await receiveSupplierOrder(fx.owner, {
      purchaseId: order.id,
      lines: [{ lineId: order.lines[0].id, goodBoxes: 0, damagedBoxes: 0 }],
    })
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveMilk(fx, 1, 1, 0, [{ productId: fx.cola.id, boxes: 1 }]),
    )
    expect(error.code).toBe('invalid')
    expect((await supplierState()).pendings).toEqual(before.pendings)
  })
})

describe('writeOffPendings', () => {
  test('writes owed boxes off with their value and lowers the balance', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    const before = await supplierState()
    const result = await writeOffPendings(fx.managerA, {
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      boxes: 2,
    })
    expect(result.valueCents).toBe(2688)
    const after = await supplierState()
    expect(after.inventory).toEqual(before.inventory)
    const entry = after.pendings.find((row) => row.type === 'written_off')
    expect(entry).toMatchObject({
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      purchaseId: null,
      quantity: -24,
      valueCents: -2688,
      actorId: fx.managerA.userId,
    })
    expect(await owedMilk(fx)).toMatchObject({
      owedBoxes: 3,
      owedValueCents: 4032,
    })
    await writeOffPendings(fx.owner, {
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      boxes: 3,
    })
    expect(await owedMilk(fx)).toBeUndefined()
  })

  test('rejects over-settlement, bad boxes and missing permission without changes', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    const input = {
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      boxes: 1,
    }
    const cases: Array<
      [
        Parameters<typeof writeOffPendings>[0],
        typeof input,
        AppErrorCode,
        string,
      ]
    > = [
      [
        fx.owner,
        { ...input, boxes: 6 },
        'invalid',
        'Las cajas a cancelar superan el saldo del proveedor.',
      ],
      [
        fx.owner,
        { ...input, productId: fx.soda.id },
        'invalid',
        'Las cajas a cancelar superan el saldo del proveedor.',
      ],
      [
        fx.owner,
        { ...input, boxes: 0 },
        'invalid',
        'Las cajas a cancelar deben ser un número entero mayor que cero.',
      ],
      [
        fx.owner,
        { ...input, boxes: 1.5 },
        'invalid',
        'Las cajas a cancelar deben ser un número entero mayor que cero.',
      ],
      [
        fx.owner,
        { ...input, supplierId: crypto.randomUUID() },
        'not_found',
        'No encontramos ese proveedor.',
      ],
      [
        fx.owner,
        { ...input, productId: crypto.randomUUID() },
        'not_found',
        'No encontramos ese producto.',
      ],
      [fx.clerkA, input, 'forbidden', forbidden],
    ]
    for (const [actor, payload, code, message] of cases) {
      const before = await supplierState()
      const error = await errorOf(() => writeOffPendings(actor, payload))
      expect([error.code, error.message]).toEqual([code, message])
      expect(await supplierState()).toEqual(before)
    }
  })

  test('concurrent write-offs cannot settle more than is owed', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    const input = {
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      boxes: 3,
    }
    const results = await Promise.allSettled([
      writeOffPendings(fx.owner, input),
      writeOffPendings(fx.owner, input),
    ])
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    )
    expect(await owedMilk(fx)).toMatchObject({ owedBoxes: 2 })
  })
})

/** Adds a box of 24 and makes it the product's default presentation. */
const switchMilkToBoxOf24 = (fx: SupplierFixture) =>
  savePresentations(fx.owner, fx.milk.id, {
    presentations: [
      ...fx.milk.presentations.map((row) => ({
        id: row.id,
        name: row.name,
        factor: row.factor,
      })),
      { name: 'Caja 24', factor: 24 },
    ],
    defaultIndex: fx.milk.presentations.length,
  })

describe('boxes use the factor of the order line, not the current default', () => {
  test('owed boxes and write-offs keep the factor the boxes were ordered with', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2) // 2 damaged + 3 missing boxes of 12
    await switchMilkToBoxOf24(fx)
    expect(await owedMilk(fx)).toMatchObject({
      boxFactor: 12,
      owedQuantity: 60,
      owedBoxes: 5,
      owedValueCents: 6720,
    })
    const result = await writeOffPendings(fx.owner, {
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      boxes: 2,
    })
    expect(result.valueCents).toBe(2688)
    const entry = (await supplierState()).pendings.find(
      (row) => row.type === 'written_off',
    )
    expect(entry).toMatchObject({ quantity: -24, valueCents: -2688 })
    expect(await owedMilk(fx)).toMatchObject({
      owedQuantity: 36,
      owedBoxes: 3,
    })
  })

  test('replacements enter as units of the original boxes', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    await switchMilkToBoxOf24(fx)
    const result = await receiveMilk(fx, 1, 1, 0, [
      { productId: fx.milk.id, boxes: 5 },
    ])
    expect(result.replacementLots[0]).toMatchObject({
      receivedQuantity: 60,
      receivedCostCents: 6720,
    })
    expect(await owedMilk(fx)).toBeUndefined()
  })

  test('over-settling in the old boxes is rejected and changes nothing', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    await switchMilkToBoxOf24(fx)
    const before = await supplierState()
    const error = await errorOf(() =>
      writeOffPendings(fx.owner, {
        supplierId: fx.supplier.id,
        productId: fx.milk.id,
        boxes: 6,
      }),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'Las cajas a cancelar superan el saldo del proveedor.',
    ])
    expect(await supplierState()).toEqual(before)
  })
})

describe('append-only ledger', () => {
  test('the database rejects updates and deletes', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 2)
    const update = await errorOf(() =>
      db.update(supplierPendings).set({ quantity: 1 }),
    )
    expect(String(update.cause ?? update.message)).toContain('append-only')
    const remove = await errorOf(() => db.delete(supplierPendings))
    expect(String(remove.cause ?? remove.message)).toContain('append-only')
    expect(
      (await db.execute(sql`select count(*)::int as n from supplier_pendings`))
        .rows[0],
    ).toEqual({ n: 2 })
    expect(await db.select().from(lots)).toHaveLength(1)
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { updateProduct } from '#/modules/catalog/services/products'
import { savePresentations } from '#/modules/catalog/services/presentations'
import {
  lots,
  purchases,
  stockMovements,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import {
  cancelSupplierOrder,
  createSupplierOrder,
  getSupplierOrder,
  listSupplierOrders,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  listSupplierPendings,
  returnPendings,
  scrapPendings,
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

/** Staff with no warehouse assignments. */
const unassigned = (actor: Actor): Actor => ({
  ...actor,
  assignments: new Map(),
})

type Replacement = {
  pendingId: string
  boxes: number
  expiresOn?: string
  noExpiry?: boolean
}

/** Orders milk (no reference, so the folio is the code) and returns the stored order. */
async function orderMilk(
  fx: SupplierFixture,
  boxes: number,
  options: {
    listPricePerPiece?: number
    discounts?: Array<{ pendingId: string }>
    supplierId?: string
  } = {},
) {
  // A catalog price change before ordering; the order snapshots it.
  if (options.listPricePerPiece !== undefined) {
    await updateProduct(fx.owner, fx.milk.id, {
      listPricePerPiece: options.listPricePerPiece,
    })
  }
  const created = await createSupplierOrder(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId: fx.a.id,
    lines: [lineFor(fx.milk, boxes)],
    discounts: options.discounts,
  })
  return getSupplierOrder(fx.owner, created.id)
}

/** Orders milk, then receives it with `missing`/`damaged` boxes (plus replacements). */
async function receiveMilk(
  fx: SupplierFixture,
  boxes: number,
  missing: number,
  damaged: number,
  replacements?: Array<Replacement>,
  listPricePerPiece?: number,
) {
  const order = await orderMilk(fx, boxes, { listPricePerPiece })
  const result = await receiveSupplierOrder(fx.owner, {
    purchaseId: order.id,
    lines: [
      {
        lineId: order.lines[0].id,
        missingBoxes: missing,
        damagedBoxes: damaged,
        noExpiry: true,
      },
    ],
    replacements,
  })
  return { order, ...result }
}

const view = (fx: SupplierFixture, supplierId = fx.supplier.id) =>
  listSupplierPendings(fx.owner, supplierId)

/** The one open "Por reponer" balance of milk. */
const restockMilk = async (fx: SupplierFixture) =>
  (await view(fx)).restock.find((row) => row.productId === fx.milk.id)

const returnMilk = async (fx: SupplierFixture) =>
  (await view(fx)).returns.find((row) => row.productId === fx.milk.id)

describe('listSupplierPendings', () => {
  test('splits what the supplier owes into Por reponer and Por devolver, with the origin order', async () => {
    const fx = await setupSupplierOrders()
    const { order } = await receiveMilk(fx, 10, 3, 2)
    const result = await listSupplierPendings(fx.managerA, fx.supplier.id)
    expect(result.restock).toHaveLength(1)
    expect(result.restock[0]).toMatchObject({
      pendingId: expect.any(String),
      kind: 'restock',
      supplierId: fx.supplier.id,
      supplierName: 'Alpura',
      productId: fx.milk.id,
      purchaseId: order.id,
      originCode: order.code,
      boxFactor: 12,
      originalBoxes: 3,
      owedQuantity: 36,
      owedBoxes: 3,
      owedValueCents: 4032,
    })
    expect(result.returns).toHaveLength(1)
    expect(result.returns[0]).toMatchObject({
      kind: 'return',
      productId: fx.milk.id,
      purchaseId: order.id,
      owedQuantity: 24,
      owedBoxes: 2,
      owedValueCents: 2688,
    })
    expect(
      result.history.map((row) => [row.type, row.quantity]).sort(),
    ).toEqual([
      ['damaged', 24],
      ['missing', 36],
    ])
    expect(await listSupplierPendings(fx.owner, fx.cocaCola.id)).toEqual({
      restock: [],
      returns: [],
      credits: [],
      history: [],
    })
    const all = await listSupplierPendings(fx.owner)
    expect([all.restock.length, all.returns.length]).toEqual([1, 1])
  })

  test('requires owner or a warehouse manager', async () => {
    const fx = await setupSupplierOrders()
    const error = await errorOf(() =>
      listSupplierPendings(unassigned(fx.managerB)),
    )
    expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    await listSupplierPendings(fx.managerB)
  })

  test('damaged boxes never enter sellable stock', async () => {
    const fx = await setupSupplierOrders()
    const result = await receiveMilk(fx, 10, 3, 2)
    expect(result.lots).toHaveLength(1)
    expect(result.lots[0]).toMatchObject({ receivedQuantity: 60, onHand: 60 })
    const stored = await db.select().from(lots)
    expect(stored.reduce((sum, lot) => sum + lot.onHand, 0)).toBe(60)
  })
})

describe('replacements at reception', () => {
  test('arrived boxes enter as a lot at the original cost with the order code and reduce the balance', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const balance = (await restockMilk(fx))!
    // The catalog price moves to 2.0000 a piece: the next order costs 2304 a box (above the 2000 standard price).
    const result = await receiveMilk(
      fx,
      4,
      0,
      0,
      [{ pendingId: balance.pendingId, boxes: 2, noExpiry: true }],
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
      code: result.order.code,
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
    expect(movements[0]).toMatchObject({
      type: 'purchase',
      quantity: 24,
      reference: result.order.id,
    })
    const replaced = (
      await db
        .select()
        .from(supplierPendings)
        .where(eq(supplierPendings.type, 'replaced'))
    )[0]
    expect(replaced).toMatchObject({
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      settlesId: balance.pendingId,
      purchaseId: result.order.id,
      quantity: -24,
      valueCents: -2688,
    })
    expect(await restockMilk(fx)).toMatchObject({
      owedBoxes: 1,
      owedQuantity: 12,
      owedValueCents: 1344,
    })
    // The damaged balance is untouched.
    expect(await returnMilk(fx)).toMatchObject({ owedBoxes: 2 })
  })

  test('a partial arrival leaves the rest open and the pieces add up to the original value', async () => {
    const fx = await setupSupplierOrders()
    // 3.3333 a piece: the 3 missing boxes cost 3 × 12 × 33333 / 100 ... not divisible by 3 boxes.
    await updateProduct(fx.owner, fx.milk.id, {
      listPricePerPiece: 33333,
      fixedDiscountPerPiece: 0,
      promotionPerPiece: 0,
    })
    await receiveMilk(fx, 3, 3, 0)
    const balance = (await restockMilk(fx))!
    const total = balance.owedValueCents
    for (const boxes of [1, 1, 1]) {
      await receiveMilk(fx, 1, 0, 0, [
        { pendingId: balance.pendingId, boxes, noExpiry: true },
      ])
    }
    const settled = await db
      .select()
      .from(supplierPendings)
      .where(eq(supplierPendings.type, 'replaced'))
    expect(settled).toHaveLength(3)
    expect(settled.reduce((sum, row) => sum + row.valueCents, 0)).toBe(-total)
    expect(await restockMilk(fx)).toBeUndefined()
  })

  test('rejects bad replacements and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const balance = (await restockMilk(fx))!
    const damaged = (await returnMilk(fx))!
    // Another supplier's missing boxes.
    const colaOrder = await createSupplierOrder(fx.owner, {
      supplierId: fx.cocaCola.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.cola, 2)],
    })
    const colaStored = await getSupplierOrder(fx.owner, colaOrder.id)
    await receiveSupplierOrder(fx.owner, {
      purchaseId: colaOrder.id,
      lines: [
        {
          lineId: colaStored.lines[0].id,
          missingBoxes: 2,
          damagedBoxes: 0,
          noExpiry: true,
        },
      ],
    })
    const foreign = (await view(fx, fx.cocaCola.id)).restock[0]
    const order = await orderMilk(fx, 1)
    const lines = [
      {
        lineId: order.lines[0].id,
        missingBoxes: 0,
        damagedBoxes: 0,
        noExpiry: true,
      },
    ]
    const cases: Array<[Array<Replacement>, AppErrorCode, string]> = [
      [
        [{ pendingId: balance.pendingId, boxes: 4, noExpiry: true }],
        'invalid',
        'Las cajas de reposición superan el saldo del proveedor.',
      ],
      [
        [{ pendingId: balance.pendingId, boxes: 0, noExpiry: true }],
        'invalid',
        'Las cajas de reposición deben ser un número entero mayor que cero.',
      ],
      [
        [{ pendingId: balance.pendingId, boxes: 1.5, noExpiry: true }],
        'invalid',
        'Las cajas de reposición deben ser un número entero mayor que cero.',
      ],
      [
        [{ pendingId: balance.pendingId, boxes: 1 }],
        'invalid',
        'Indica la caducidad de cada producto que entra o marca «Sin caducidad».',
      ],
      [
        [
          { pendingId: balance.pendingId, boxes: 1, noExpiry: true },
          { pendingId: balance.pendingId, boxes: 1, noExpiry: true },
        ],
        'invalid',
        'Cada saldo solo puede aparecer una vez en la reposición.',
      ],
      [
        [{ pendingId: crypto.randomUUID(), boxes: 1, noExpiry: true }],
        'not_found',
        'No encontramos ese saldo.',
      ],
      [
        [{ pendingId: foreign.pendingId, boxes: 1, noExpiry: true }],
        'invalid',
        'Ese saldo no pertenece a este proveedor.',
      ],
      [
        [{ pendingId: damaged.pendingId, boxes: 1, noExpiry: true }],
        'invalid',
        'Ese saldo no es un faltante por reponer.',
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

  test('a closed balance cannot be replaced again', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const balance = (await restockMilk(fx))!
    await receiveMilk(fx, 1, 0, 0, [
      { pendingId: balance.pendingId, boxes: 3, noExpiry: true },
    ])
    const order = await orderMilk(fx, 1)
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(fx.owner, {
        purchaseId: order.id,
        lines: [
          {
            lineId: order.lines[0].id,
            missingBoxes: 0,
            damagedBoxes: 0,
            noExpiry: true,
          },
        ],
        replacements: [
          { pendingId: balance.pendingId, boxes: 1, noExpiry: true },
        ],
      }),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'Las cajas de reposición superan el saldo del proveedor.',
    ])
    expect(await supplierState()).toEqual(before)
  })
})

describe('discounts on a new order', () => {
  test('closes the balance "a lo chino", stores the amount and exposes net, discounts and payable', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const balance = (await restockMilk(fx))!
    const order = await orderMilk(fx, 5, {
      discounts: [{ pendingId: balance.pendingId }],
    })
    expect(order).toMatchObject({
      totalCostCents: 6720,
      discountCents: 4032,
      payableCents: 2688,
    })
    expect((await view(fx)).restock).toEqual([])
    const entry = (
      await db
        .select()
        .from(supplierPendings)
        .where(eq(supplierPendings.type, 'discounted'))
    )[0]
    expect(entry).toMatchObject({
      supplierId: fx.supplier.id,
      productId: fx.milk.id,
      settlesId: balance.pendingId,
      purchaseId: order.id,
      quantity: -36,
      valueCents: -4032,
      actorId: fx.owner.userId,
    })
    const [summary] = (
      await listSupplierOrders(fx.owner, {
        warehouseId: fx.a.id,
        status: 'Pedido',
      })
    ).filter((row) => row.id === order.id)
    expect(summary).toMatchObject({
      totalCostCents: 6720,
      discountCents: 4032,
      payableCents: 2688,
    })
    // The damaged balance stays.
    expect(await returnMilk(fx)).toMatchObject({ owedBoxes: 2 })
  })

  test('discounts what is still open of a partly replaced balance', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const balance = (await restockMilk(fx))!
    await receiveMilk(fx, 1, 0, 0, [
      { pendingId: balance.pendingId, boxes: 1, noExpiry: true },
    ])
    const order = await orderMilk(fx, 5, {
      discounts: [{ pendingId: balance.pendingId }],
    })
    expect(order.discountCents).toBe(2688)
    expect((await view(fx)).restock).toEqual([])
  })

  test('without discounts the payable equals the net total', async () => {
    const fx = await setupSupplierOrders()
    const order = await orderMilk(fx, 5)
    expect(order).toMatchObject({
      totalCostCents: 6720,
      discountCents: 0,
      payableCents: 6720,
    })
  })

  test('cancelling reopens a discounted balance worth nothing', async () => {
    const fx = await setupSupplierOrders()
    const free = await createSupplierOrder(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.free, 10)],
    })
    const freeOrder = await getSupplierOrder(fx.owner, free.id)
    await receiveSupplierOrder(fx.owner, {
      purchaseId: freeOrder.id,
      lines: [
        {
          lineId: freeOrder.lines[0].id,
          missingBoxes: 3,
          damagedBoxes: 0,
          noExpiry: true,
        },
      ],
    })
    const restockFree = async () =>
      (await view(fx)).restock.find((row) => row.productId === fx.free.id)
    const balance = (await restockFree())!
    expect(balance).toMatchObject({ owedBoxes: 3, owedValueCents: 0 })
    const order = await orderMilk(fx, 5, {
      discounts: [{ pendingId: balance.pendingId }],
    })
    expect(order.discountCents).toBe(0)
    expect(await restockFree()).toBeUndefined()
    await cancelSupplierOrder(fx.owner, order.id)
    expect(await restockFree()).toMatchObject({
      pendingId: balance.pendingId,
      owedBoxes: 3,
      owedValueCents: 0,
    })
  })

  test('cancelling the order reopens the balances and zeroes the discount', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const balance = (await restockMilk(fx))!
    const order = await orderMilk(fx, 5, {
      discounts: [{ pendingId: balance.pendingId }],
    })
    await cancelSupplierOrder(fx.owner, order.id)
    expect(await restockMilk(fx)).toMatchObject({
      pendingId: balance.pendingId,
      owedBoxes: 3,
      owedValueCents: 4032,
    })
    const stored = await getSupplierOrder(fx.owner, order.id)
    expect(stored).toMatchObject({
      status: 'Cancelado',
      discountCents: 0,
      payableCents: 6720,
    })
    const reopened = (
      await db
        .select()
        .from(supplierPendings)
        .where(eq(supplierPendings.type, 'reopened'))
    )[0]
    expect(reopened).toMatchObject({
      settlesId: balance.pendingId,
      purchaseId: order.id,
      quantity: 36,
      valueCents: 4032,
    })
    // The history is kept: origin, discount and reopening.
    expect((await view(fx)).history.map((row) => row.type).sort()).toEqual([
      'discounted',
      'missing',
      'reopened',
    ])
    // And the balance can be discounted again.
    const again = await orderMilk(fx, 5, {
      discounts: [{ pendingId: balance.pendingId }],
    })
    expect(again.discountCents).toBe(4032)
  })

  test('rejects invalid discounts and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const balance = (await restockMilk(fx))!
    const damaged = (await returnMilk(fx))!
    const colaOrder = await createSupplierOrder(fx.owner, {
      supplierId: fx.cocaCola.id,
      warehouseId: fx.a.id,
      lines: [lineFor(fx.cola, 2)],
    })
    const colaStored = await getSupplierOrder(fx.owner, colaOrder.id)
    await receiveSupplierOrder(fx.owner, {
      purchaseId: colaOrder.id,
      lines: [
        {
          lineId: colaStored.lines[0].id,
          missingBoxes: 2,
          damagedBoxes: 0,
          noExpiry: true,
        },
      ],
    })
    const foreign = (await view(fx, fx.cocaCola.id)).restock[0]
    await receiveMilk(fx, 1, 1, 0) // a second, independent balance
    const second = (await view(fx)).restock.find(
      (row) => row.pendingId !== balance.pendingId,
    )!
    await receiveMilk(fx, 1, 0, 0, [
      { pendingId: second.pendingId, boxes: 1, noExpiry: true },
    ])
    const cases: Array<
      [Array<{ pendingId: string }>, number, AppErrorCode, string]
    > = [
      [
        [{ pendingId: foreign.pendingId }],
        5,
        'invalid',
        'Ese saldo no pertenece a este proveedor.',
      ],
      [
        [{ pendingId: second.pendingId }],
        5,
        'invalid',
        'Ese saldo ya está cerrado.',
      ],
      [
        [{ pendingId: balance.pendingId }, { pendingId: balance.pendingId }],
        5,
        'invalid',
        'Cada saldo solo se puede descontar una vez en el pedido.',
      ],
      [
        [{ pendingId: damaged.pendingId }],
        5,
        'invalid',
        'Solo se pueden descontar faltantes por reponer o descuentos a favor.',
      ],
      [
        [{ pendingId: crypto.randomUUID() }],
        5,
        'not_found',
        'No encontramos ese saldo.',
      ],
      [
        [{ pendingId: balance.pendingId }],
        2,
        'invalid',
        'Los descuentos no pueden superar el total del pedido.',
      ],
    ]
    for (const [discounts, boxes, code, message] of cases) {
      const before = await supplierState()
      const error = await errorOf(() =>
        createSupplierOrder(fx.owner, {
          supplierId: fx.supplier.id,
          warehouseId: fx.a.id,
          lines: [lineFor(fx.milk, boxes)],
          discounts,
        }),
      )
      expect([error.code, error.message]).toEqual([code, message])
      expect(await supplierState()).toEqual(before)
    }
  })

  test('a balance discounted by a live order cannot be discounted by another', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const balance = (await restockMilk(fx))!
    await orderMilk(fx, 5, { discounts: [{ pendingId: balance.pendingId }] })
    const before = await supplierState()
    const error = await errorOf(() =>
      orderMilk(fx, 5, { discounts: [{ pendingId: balance.pendingId }] }),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'Ese saldo ya está cerrado.',
    ])
    expect(await supplierState()).toEqual(before)
  })

  test('concurrent orders cannot discount the same balance twice', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    const balance = (await restockMilk(fx))!
    const place = () =>
      createSupplierOrder(fx.owner, {
        supplierId: fx.supplier.id,
        warehouseId: fx.a.id,
        lines: [lineFor(fx.milk, 5)],
        discounts: [{ pendingId: balance.pendingId }],
      })
    const results = await Promise.allSettled([place(), place()])
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    )
    const discounted = await db
      .select()
      .from(supplierPendings)
      .where(eq(supplierPendings.type, 'discounted'))
    expect(discounted).toHaveLength(1)
    expect(
      (await db.select().from(purchases)).filter(
        (row) => row.discountCents > 0,
      ),
    ).toHaveLength(1)
  })
})

describe('returnPendings', () => {
  test('closing by replacement records the boxes taken back and their value', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const damaged = (await returnMilk(fx))!
    const before = await supplierState()
    const result = await returnPendings(fx.managerA, {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'replacement',
    })
    expect(result).toEqual({ valueCents: 1344, creditCents: null })
    const after = await supplierState()
    expect(after.inventory).toEqual(before.inventory)
    expect(after.pendings.find((row) => row.type === 'returned')).toMatchObject(
      {
        settlesId: damaged.pendingId,
        quantity: -12,
        valueCents: -1344,
        resolution: 'replacement',
        creditCents: null,
        actorId: fx.managerA.userId,
      },
    )
    expect(await returnMilk(fx)).toMatchObject({ owedBoxes: 1 })
  })

  test('closing by discount records the amount, by default the original value', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 3)
    const damaged = (await returnMilk(fx))!
    expect(
      await returnPendings(fx.owner, {
        pendingId: damaged.pendingId,
        boxes: 1,
        resolution: 'discount',
      }),
    ).toEqual({ valueCents: 1344, creditCents: 1344 })
    expect(
      await returnPendings(fx.owner, {
        pendingId: damaged.pendingId,
        boxes: 2,
        resolution: 'discount',
        creditCents: 2500,
      }),
    ).toEqual({ valueCents: 2688, creditCents: 2500 })
    expect(await returnMilk(fx)).toBeUndefined()
    const returned = (await db.select().from(supplierPendings)).filter(
      (row) => row.type === 'returned',
    )
    expect(returned.map((row) => row.creditCents).sort()).toEqual([1344, 2500])
  })

  test('rejects bad returns and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const damaged = (await returnMilk(fx))!
    const missing = (await restockMilk(fx))!
    const input = {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'discount' as const,
    }
    const cases: Array<
      [
        Parameters<typeof returnPendings>[0],
        Parameters<typeof returnPendings>[1],
        AppErrorCode,
        string,
      ]
    > = [
      [
        fx.owner,
        { ...input, boxes: 3 },
        'invalid',
        'Las cajas a devolver superan el saldo del proveedor.',
      ],
      [
        fx.owner,
        { ...input, boxes: 0 },
        'invalid',
        'Las cajas a devolver deben ser un número entero mayor que cero.',
      ],
      [
        fx.owner,
        { ...input, pendingId: missing.pendingId },
        'invalid',
        'Solo se pueden devolver cajas dañadas o caducadas.',
      ],
      [
        fx.owner,
        { ...input, pendingId: crypto.randomUUID() },
        'not_found',
        'No encontramos ese saldo.',
      ],
      [
        fx.owner,
        { ...input, creditCents: -1 },
        'invalid',
        'El monto del descuento debe ser un entero de cero o más.',
      ],
      [
        fx.owner,
        { ...input, resolution: 'replacement', creditCents: 100 },
        'invalid',
        'Solo un descuento lleva monto.',
      ],
      [unassigned(fx.managerB), input, 'forbidden', forbidden],
    ]
    for (const [actor, payload, code, message] of cases) {
      const before = await supplierState()
      const error = await errorOf(() => returnPendings(actor, payload))
      expect([error.code, error.message]).toEqual([code, message])
      expect(await supplierState()).toEqual(before)
    }
  })
})

describe('return credits', () => {
  const creditMilk = async (fx: SupplierFixture) =>
    (await view(fx)).credits.find((row) => row.productId === fx.milk.id)

  test('a discount leaves a credit that is only discounted when chosen on an order', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 3)
    const damaged = (await returnMilk(fx))!
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 2,
      resolution: 'discount',
      creditCents: 2500,
    })
    const credit = (await creditMilk(fx))!
    expect(credit).toMatchObject({
      kind: 'credit',
      supplierId: fx.supplier.id,
      owedBoxes: 2,
      owedValueCents: 2500,
      originCode: damaged.originCode,
    })
    expect((await view(fx)).restock).toEqual([])
    // Never automatic: an order that does not choose it leaves it open.
    const plain = await orderMilk(fx, 5)
    expect(plain.discountCents).toBe(0)
    expect(await creditMilk(fx)).toMatchObject({ owedValueCents: 2500 })
    const order = await orderMilk(fx, 5, {
      discounts: [{ pendingId: credit.pendingId }],
    })
    expect(order).toMatchObject({ discountCents: 2500, payableCents: 4220 })
    expect(await creditMilk(fx)).toBeUndefined()
    await cancelSupplierOrder(fx.owner, order.id)
    expect(await creditMilk(fx)).toMatchObject({
      pendingId: credit.pendingId,
      owedValueCents: 2500,
    })
  })

  test('a replacement or a zero discount leaves no credit', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 3)
    const damaged = (await returnMilk(fx))!
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'replacement',
    })
    await returnPendings(fx.owner, {
      pendingId: damaged.pendingId,
      boxes: 1,
      resolution: 'discount',
      creditCents: 0,
    })
    expect((await view(fx)).credits).toEqual([])
  })
})

describe('scrapPendings', () => {
  test('closing damaged boxes as merma records their value as lost and leaves stock alone', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 0, 3)
    const damaged = (await returnMilk(fx))!
    const before = await supplierState()
    expect(
      await scrapPendings(fx.managerA, {
        pendingId: damaged.pendingId,
        boxes: 1,
      }),
    ).toEqual({ valueCents: 1344 })
    expect(await returnMilk(fx)).toMatchObject({ owedBoxes: 2 })
    expect(
      await scrapPendings(fx.owner, { pendingId: damaged.pendingId, boxes: 2 }),
    ).toEqual({ valueCents: 2688 })
    expect(await returnMilk(fx)).toBeUndefined()
    const after = await supplierState()
    expect(after.inventory).toEqual(before.inventory)
    const scrapped = after.pendings.filter((row) => row.type === 'scrapped')
    expect(scrapped.map((row) => row.quantity).sort()).toEqual([-12, -24])
    expect(scrapped.find((row) => row.quantity === -12)).toMatchObject({
      settlesId: damaged.pendingId,
      purchaseId: null,
      quantity: -12,
      valueCents: -1344,
      resolution: null,
      creditCents: null,
      actorId: fx.managerA.userId,
    })
  })

  test('rejects bad write-offs and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    const damaged = (await returnMilk(fx))!
    const missing = (await restockMilk(fx))!
    const input = { pendingId: damaged.pendingId, boxes: 1 }
    const cases: Array<
      [
        Parameters<typeof scrapPendings>[0],
        Parameters<typeof scrapPendings>[1],
        AppErrorCode,
        string,
      ]
    > = [
      [
        fx.owner,
        { ...input, boxes: 3 },
        'invalid',
        'Las cajas a dar por merma superan el saldo del proveedor.',
      ],
      [
        fx.owner,
        { ...input, boxes: 0 },
        'invalid',
        'Las cajas a dar por merma deben ser un número entero mayor que cero.',
      ],
      [
        fx.owner,
        { ...input, pendingId: missing.pendingId },
        'invalid',
        'Solo se pueden dar por merma cajas dañadas o caducadas.',
      ],
      [
        fx.owner,
        { ...input, pendingId: crypto.randomUUID() },
        'not_found',
        'No encontramos ese saldo.',
      ],
      [unassigned(fx.managerB), input, 'forbidden', forbidden],
    ]
    for (const [actor, payload, code, message] of cases) {
      const before = await supplierState()
      const error = await errorOf(() => scrapPendings(actor, payload))
      expect([error.code, error.message]).toEqual([code, message])
      expect(await supplierState()).toEqual(before)
    }
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
  test('owed boxes and partial replacements keep the factor the boxes were ordered with', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
    await switchMilkToBoxOf24(fx)
    const balance = (await restockMilk(fx))!
    expect(balance).toMatchObject({
      boxFactor: 12,
      owedQuantity: 36,
      owedBoxes: 3,
      owedValueCents: 4032,
    })
    const result = await receiveMilk(fx, 1, 0, 0, [
      { pendingId: balance.pendingId, boxes: 2, noExpiry: true },
    ])
    expect(result.replacementLots[0]).toMatchObject({
      receivedQuantity: 24,
      receivedCostCents: 2688,
    })
    expect(await restockMilk(fx)).toMatchObject({
      owedQuantity: 12,
      owedBoxes: 1,
    })
  })

  test('replacements enter as units of the original boxes', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 5, 0)
    await switchMilkToBoxOf24(fx)
    const balance = (await restockMilk(fx))!
    const result = await receiveMilk(fx, 1, 0, 0, [
      { pendingId: balance.pendingId, boxes: 5, noExpiry: true },
    ])
    expect(result.replacementLots[0]).toMatchObject({
      receivedQuantity: 60,
      receivedCostCents: 6720,
    })
    expect(await restockMilk(fx)).toBeUndefined()
  })

  test('over-settling in the old boxes is rejected and changes nothing', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 0)
    await switchMilkToBoxOf24(fx)
    const balance = (await restockMilk(fx))!
    const order = await orderMilk(fx, 1)
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(fx.owner, {
        purchaseId: order.id,
        lines: [
          {
            lineId: order.lines[0].id,
            missingBoxes: 0,
            damagedBoxes: 0,
            noExpiry: true,
          },
        ],
        replacements: [
          { pendingId: balance.pendingId, boxes: 4, noExpiry: true },
        ],
      }),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'Las cajas de reposición superan el saldo del proveedor.',
    ])
    expect(await supplierState()).toEqual(before)
  })
})

describe('append-only ledger', () => {
  test('the database rejects updates and deletes', async () => {
    const fx = await setupSupplierOrders()
    await receiveMilk(fx, 10, 3, 2)
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

describe('order list shortages', () => {
  test('received orders expose what was missing and damaged with its value; others show zero', async () => {
    const fx = await setupSupplierOrders()
    const { order } = await receiveMilk(fx, 10, 3, 2)
    const waiting = await orderMilk(fx, 4)
    const rows = await listSupplierOrders(fx.owner, { warehouseId: fx.a.id })
    expect(rows.find((row) => row.id === order.id)).toMatchObject({
      status: 'Recibido',
      missingQuantity: 36,
      damagedQuantity: 24,
      missingValueCents: 4032,
      damagedValueCents: 2688,
    })
    expect(rows.find((row) => row.id === waiting.id)).toMatchObject({
      status: 'Pedido',
      missingQuantity: 0,
      damagedQuantity: 0,
      missingValueCents: 0,
      damagedValueCents: 0,
    })
  })

  test('a complete reception reports no shortages', async () => {
    const fx = await setupSupplierOrders()
    const { order } = await receiveMilk(fx, 5, 0, 0)
    const [row] = (
      await listSupplierOrders(fx.owner, { warehouseId: fx.a.id })
    ).filter((item) => item.id === order.id)
    expect(row).toMatchObject({ missingQuantity: 0, damagedQuantity: 0 })
  })
})

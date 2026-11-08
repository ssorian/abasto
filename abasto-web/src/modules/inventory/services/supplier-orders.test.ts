import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { updateProduct } from '#/modules/catalog/services/products'
import {
  lots,
  purchaseLines,
  stockMovements,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import { createPurchase } from '#/modules/inventory/services/purchases'
import {
  cancelSupplierOrder,
  createSupplierOrder,
  getSupplierOrder,
  listSupplierOrders,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import {
  errorOf,
  setupSupplierOrders,
  supplierState,
} from '#/modules/inventory/services/supplier-testing'
import type { SupplierFixture } from '#/modules/inventory/services/supplier-testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

const orderOf = (
  fx: SupplierFixture,
  overrides: Record<string, unknown> = {},
) => ({
  supplierId: fx.supplier.id,
  warehouseId: fx.a.id,
  expectedOn: '2026-11-10',
  reference: 'PED-1',
  lines: [
    { productId: fx.milk.id, boxes: 10 },
    { productId: fx.soda.id, boxes: 2 },
  ],
  ...overrides,
})

async function rejectsCreate(
  fx: SupplierFixture,
  input: ReturnType<typeof orderOf>,
  code: AppErrorCode,
  message: string,
  actor = fx.owner,
) {
  const before = await supplierState()
  const error = await errorOf(() => createSupplierOrder(actor, input))
  expect(error.code).toBe(code)
  expect(error.message).toBe(message)
  expect(await supplierState()).toEqual(before)
}

describe('createSupplierOrder', () => {
  test('stores a Pedido priced from the catalog and moves no stock', async () => {
    const fx = await setupSupplierOrders()
    const created = await createSupplierOrder(fx.managerA, orderOf(fx))
    expect(created.missingCostProductIds).toEqual([])
    const order = await getSupplierOrder(fx.managerA, created.id)
    expect(order).toMatchObject({
      status: 'Pedido',
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      expectedOn: '2026-11-10',
      reference: 'PED-1',
      receivedAt: null,
      receivedBy: null,
    })
    expect(order.lines).toHaveLength(2)
    expect(order.lines[0]).toMatchObject({
      productId: fx.milk.id,
      boxes: 10,
      quantity: 120,
      totalCostCents: 13440,
      goodQuantity: null,
      damagedQuantity: null,
    })
    expect(order.lines[1]).toMatchObject({
      productId: fx.soda.id,
      quantity: 48,
      totalCostCents: 4032,
    })
    const state = await supplierState()
    expect(state.inventory.lots).toEqual([])
    expect(state.inventory.movements).toBe(0)
    expect(state.pendings).toEqual([])
  })

  test('accepts a product without supplier cost and flags it', async () => {
    const fx = await setupSupplierOrders()
    const created = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [{ productId: fx.free.id, boxes: 3 }] }),
    )
    expect(created.missingCostProductIds).toEqual([fx.free.id])
    const order = await getSupplierOrder(fx.owner, created.id)
    expect(order.lines[0]).toMatchObject({ quantity: 18, totalCostCents: 0 })
  })

  test('rejects invalid orders and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    const cases: Array<[Record<string, unknown>, AppErrorCode, string]> = [
      [
        { lines: [{ productId: fx.cola.id, boxes: 1 }] },
        'invalid',
        'Ese producto no pertenece a este proveedor.',
      ],
      [{ lines: [] }, 'invalid', 'Agrega al menos un producto al pedido.'],
      [
        {
          lines: [
            { productId: fx.milk.id, boxes: 1 },
            { productId: fx.milk.id, boxes: 2 },
          ],
        },
        'invalid',
        'Cada producto solo puede aparecer una vez en el pedido.',
      ],
      [
        { lines: [{ productId: fx.milk.id, boxes: 0 }] },
        'invalid',
        'Las cajas deben ser un número entero mayor que cero.',
      ],
      [
        { lines: [{ productId: fx.milk.id, boxes: 1.5 }] },
        'invalid',
        'Las cajas deben ser un número entero mayor que cero.',
      ],
      [
        { lines: [{ productId: fx.milk.id, boxes: 999_999_999 }] },
        'invalid',
        'El pedido es demasiado grande.',
      ],
      [
        { lines: [{ productId: crypto.randomUUID(), boxes: 1 }] },
        'not_found',
        'No encontramos ese producto.',
      ],
      [
        { supplierId: crypto.randomUUID() },
        'not_found',
        'No encontramos ese proveedor.',
      ],
      [
        { warehouseId: fx.a.id, expectedOn: '2026-02-31' },
        'invalid',
        'La fecha esperada no es válida.',
      ],
    ]
    for (const [overrides, code, message] of cases) {
      await rejectsCreate(fx, orderOf(fx, overrides), code, message)
    }
  })

  test('rejects an unknown warehouse', async () => {
    const fx = await setupSupplierOrders()
    await rejectsCreate(
      fx,
      orderOf(fx, { warehouseId: crypto.randomUUID() }),
      'not_found',
      'No encontramos ese almacén.',
    )
  })

  test('requires warehouse.manage on the order warehouse', async () => {
    const fx = await setupSupplierOrders()
    await rejectsCreate(fx, orderOf(fx), 'forbidden', forbidden, fx.clerkA)
    await rejectsCreate(fx, orderOf(fx), 'forbidden', forbidden, fx.managerB)
  })
})

describe('cancelSupplierOrder', () => {
  test('moves a Pedido to Cancelado without touching stock', async () => {
    const fx = await setupSupplierOrders()
    const { id } = await createSupplierOrder(fx.owner, orderOf(fx))
    const before = await supplierState()
    await cancelSupplierOrder(fx.managerA, id)
    const order = await getSupplierOrder(fx.owner, id)
    expect(order.status).toBe('Cancelado')
    const after = await supplierState()
    expect(after.inventory).toEqual(before.inventory)
    expect(after.pendings).toEqual([])
  })

  test('refuses a second cancel, a received order, other warehouses and unknown ids', async () => {
    const fx = await setupSupplierOrders()
    const { id } = await createSupplierOrder(fx.owner, orderOf(fx))
    const before = await supplierState()
    const denied = await errorOf(() => cancelSupplierOrder(fx.managerB, id))
    expect([denied.code, denied.message]).toEqual(['forbidden', forbidden])
    const missing = await errorOf(() =>
      cancelSupplierOrder(fx.owner, crypto.randomUUID()),
    )
    expect([missing.code, missing.message]).toEqual([
      'not_found',
      'No encontramos ese pedido.',
    ])
    expect(await supplierState()).toEqual(before)

    await cancelSupplierOrder(fx.owner, id)
    const again = await errorOf(() => cancelSupplierOrder(fx.owner, id))
    expect([again.code, again.message]).toEqual([
      'conflict',
      'Solo se puede cancelar un pedido pendiente de recibir.',
    ])

    const second = await createSupplierOrder(fx.owner, orderOf(fx))
    const order = await getSupplierOrder(fx.owner, second.id)
    await receiveSupplierOrder(fx.owner, {
      purchaseId: second.id,
      lines: order.lines.map((line) => ({
        lineId: line.id,
        goodBoxes: line.boxes,
        damagedBoxes: 0,
      })),
    })
    const snapshot = await supplierState()
    const received = await errorOf(() =>
      cancelSupplierOrder(fx.owner, second.id),
    )
    expect(received.code).toBe('conflict')
    expect(await supplierState()).toEqual(snapshot)
  })
})

async function pendingOrder(fx: SupplierFixture, boxes = 10) {
  const created = await createSupplierOrder(
    fx.owner,
    orderOf(fx, {
      lines: [
        { productId: fx.milk.id, boxes },
        { productId: fx.soda.id, boxes: 2 },
      ],
    }),
  )
  return getSupplierOrder(fx.owner, created.id)
}

const arrive = (
  order: Awaited<ReturnType<typeof pendingOrder>>,
  perLine: Array<{ goodBoxes: number; damagedBoxes: number }>,
  extra: Record<string, unknown> = {},
) => ({
  purchaseId: order.id,
  lines: order.lines.map((line, index) => ({
    lineId: line.id,
    ...perLine[index],
  })),
  ...extra,
})

describe('receiveSupplierOrder', () => {
  test('creates one lot per line with good boxes at the catalog cost and standard price rule', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { goodBoxes: 10, damagedBoxes: 0 },
      { goodBoxes: 2, damagedBoxes: 0 },
    ])
    input.lines[0] = {
      ...input.lines[0],
      lotCode: 'L-9',
      expiresOn: '2026-12-01',
    } as (typeof input.lines)[number]
    const result = await receiveSupplierOrder(fx.managerA, input)
    expect(result.lots).toHaveLength(2)
    const [milkLot, sodaLot] = result.lots
    expect(milkLot).toMatchObject({
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      code: 'L-9',
      expiresOn: '2026-12-01',
      receivedQuantity: 120,
      receivedCostCents: 13440,
      salePriceCents: 2000,
      onHand: 120,
    })
    // Standard 1500 is below the 2016 cost per box: the lot follows the standard.
    expect(sodaLot).toMatchObject({
      receivedQuantity: 48,
      receivedCostCents: 4032,
      salePriceCents: null,
    })
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.lotId, milkLot.id))
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      type: 'purchase',
      quantity: 120,
      reference: order.id,
      actorId: fx.managerA.userId,
    })
    const stored = await getSupplierOrder(fx.owner, order.id)
    expect(stored.status).toBe('Recibido')
    expect(stored.receivedBy).toBe(fx.managerA.userId)
    expect(stored.receivedAt).toBeInstanceOf(Date)
    expect(stored.lines[0]).toMatchObject({
      goodQuantity: 120,
      damagedQuantity: 0,
      lotCode: 'L-9',
    })
    expect((await supplierState()).pendings).toEqual([])
  })

  test('records damaged and missing boxes as pendings and brings in only the good ones', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { goodBoxes: 5, damagedBoxes: 2 },
        { goodBoxes: 0, damagedBoxes: 2 },
      ]),
    )
    // Only the milk line has good boxes: one lot of 5 boxes.
    expect(result.lots).toHaveLength(1)
    expect(result.lots[0]).toMatchObject({
      receivedQuantity: 60,
      receivedCostCents: 6720,
      onHand: 60,
    })
    const pendings = (await supplierState()).pendings
    const byKey = new Map(
      pendings.map((row) => [`${row.productId}:${row.type}`, row]),
    )
    expect(pendings).toHaveLength(3)
    expect(byKey.get(`${fx.milk.id}:damaged`)).toMatchObject({
      supplierId: fx.supplier.id,
      purchaseId: order.id,
      quantity: 24,
      valueCents: 2688,
      actorId: fx.owner.userId,
    })
    expect(byKey.get(`${fx.milk.id}:missing`)).toMatchObject({
      quantity: 36,
      valueCents: 4032,
    })
    expect(byKey.get(`${fx.soda.id}:damaged`)).toMatchObject({
      quantity: 48,
      valueCents: 4032,
    })
    expect(byKey.has(`${fx.soda.id}:missing`)).toBe(false)
    const stored = await getSupplierOrder(fx.owner, order.id)
    expect(stored.lines[0]).toMatchObject({
      goodQuantity: 60,
      damagedQuantity: 24,
      missingQuantity: 36,
    })
    expect(stored.lines[1]).toMatchObject({
      goodQuantity: 0,
      missingQuantity: 0,
    })
  })

  test('rounds pending values once, half up', async () => {
    const fx = await setupSupplierOrders()
    // 3 boxes cost 4032 + ... use soda: 2016 per box; 1 box of 24 pieces, 7 damaged pieces cannot occur;
    // an odd line cost proves the single rounding: 5 boxes of milk, 1 damaged = 1344 exactly.
    const order = await pendingOrder(fx, 5)
    await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { goodBoxes: 4, damagedBoxes: 1 },
        { goodBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    const rows = await db.select().from(supplierPendings)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'damaged', valueCents: 1344 })
  })

  test('rejects wrong reception input and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const ok = [
      { goodBoxes: 10, damagedBoxes: 0 },
      { goodBoxes: 2, damagedBoxes: 0 },
    ]
    const cases: Array<[Record<string, unknown>, AppErrorCode, string]> = [
      [
        arrive(order, [{ goodBoxes: 8, damagedBoxes: 3 }, ok[1]]),
        'invalid',
        'Las cajas buenas y dañadas no pueden superar las cajas pedidas.',
      ],
      [
        arrive(order, [{ goodBoxes: -1, damagedBoxes: 0 }, ok[1]]),
        'invalid',
        'Las cajas recibidas deben ser enteros de cero o más.',
      ],
      [
        arrive(order, [{ goodBoxes: 1.5, damagedBoxes: 0 }, ok[1]]),
        'invalid',
        'Las cajas recibidas deben ser enteros de cero o más.',
      ],
      [
        { ...arrive(order, ok), lines: arrive(order, ok).lines.slice(0, 1) },
        'invalid',
        'Captura la recepción de todas las líneas del pedido.',
      ],
      [
        {
          ...arrive(order, ok),
          lines: [arrive(order, ok).lines[0], arrive(order, ok).lines[0]],
        },
        'invalid',
        'Captura la recepción de todas las líneas del pedido.',
      ],
      [
        {
          ...arrive(order, ok),
          lines: [
            arrive(order, ok).lines[0],
            { lineId: crypto.randomUUID(), goodBoxes: 1, damagedBoxes: 0 },
          ],
        },
        'invalid',
        'Captura la recepción de todas las líneas del pedido.',
      ],
      [
        {
          ...arrive(order, ok),
          lines: arrive(order, ok).lines.map((line) => ({
            ...line,
            expiresOn: '2026-13-01',
          })),
        },
        'invalid',
        'La fecha de caducidad no es válida.',
      ],
      [
        { ...arrive(order, ok), purchaseId: crypto.randomUUID() },
        'not_found',
        'No encontramos ese pedido.',
      ],
      [
        arrive(order, ok, {
          replacements: [{ productId: fx.milk.id, boxes: 1 }],
        }),
        'invalid',
        'Las cajas de reposición superan el saldo del proveedor.',
      ],
    ]
    for (const [input, code, message] of cases) {
      const before = await supplierState()
      const error = await errorOf(() =>
        receiveSupplierOrder(fx.owner, input as never),
      )
      expect([error.code, error.message]).toEqual([code, message])
      expect(await supplierState()).toEqual(before)
    }
  })

  test('requires warehouse.manage of the order warehouse', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { goodBoxes: 10, damagedBoxes: 0 },
      { goodBoxes: 2, damagedBoxes: 0 },
    ])
    const before = await supplierState()
    for (const actor of [fx.clerkA, fx.managerB]) {
      const error = await errorOf(() => receiveSupplierOrder(actor, input))
      expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    }
    expect(await supplierState()).toEqual(before)
  })

  test('refuses to receive an order twice or a cancelled one', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { goodBoxes: 10, damagedBoxes: 0 },
      { goodBoxes: 2, damagedBoxes: 0 },
    ])
    await receiveSupplierOrder(fx.owner, input)
    const received = await supplierState()
    const again = await errorOf(() => receiveSupplierOrder(fx.owner, input))
    expect([again.code, again.message]).toEqual([
      'conflict',
      'Ese pedido ya no está pendiente de recibir.',
    ])
    expect(await supplierState()).toEqual(received)

    const other = await pendingOrder(fx)
    await cancelSupplierOrder(fx.owner, other.id)
    const cancelled = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(
        fx.owner,
        arrive(other, [
          { goodBoxes: 1, damagedBoxes: 0 },
          { goodBoxes: 1, damagedBoxes: 0 },
        ]),
      ),
    )
    expect(error.code).toBe('conflict')
    expect(await supplierState()).toEqual(cancelled)
  })

  test('concurrent receptions of one order create the stock only once', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { goodBoxes: 10, damagedBoxes: 0 },
      { goodBoxes: 2, damagedBoxes: 0 },
    ])
    const results = await Promise.allSettled([
      receiveSupplierOrder(fx.owner, input),
      receiveSupplierOrder(fx.owner, input),
    ])
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    )
    const failed = results.find(({ status }) => status === 'rejected')
    expect((failed as PromiseRejectedResult).reason.code).toBe('conflict')
    expect(await db.select().from(lots)).toHaveLength(2)
    expect(await db.select().from(stockMovements)).toHaveLength(2)
  })

  test('FIFO selling keeps working on the received lots', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { goodBoxes: 10, damagedBoxes: 0 },
        { goodBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(result.lots[0].reserved).toBe(0)
    const [line] = await db
      .select()
      .from(purchaseLines)
      .where(eq(purchaseLines.id, order.lines[0].id))
    const [lot] = await db
      .select()
      .from(lots)
      .where(eq(lots.purchaseLineId, line.id))
    expect(lot.onHand).toBe(120)
  })
})

describe('legacy and listing', () => {
  test('a direct purchase is stored as already received', async () => {
    const fx = await setupSupplierOrders()
    const created = await createPurchase(fx.managerA, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [{ productId: fx.milk.id, quantity: 24, totalCostCents: 2688 }],
    })
    const order = await getSupplierOrder(fx.owner, created.id)
    expect(order).toMatchObject({
      status: 'Recibido',
      receivedBy: fx.managerA.userId,
    })
    expect(order.receivedAt).toBeInstanceOf(Date)
    expect(order.lines[0]).toMatchObject({
      goodQuantity: 24,
      damagedQuantity: 0,
      missingQuantity: 0,
    })
  })

  test('lists a warehouse queue filtered by status', async () => {
    const fx = await setupSupplierOrders()
    const first = await createSupplierOrder(fx.owner, orderOf(fx))
    const second = await createSupplierOrder(fx.owner, orderOf(fx))
    await createSupplierOrder(fx.owner, orderOf(fx, { warehouseId: fx.b.id }))
    await cancelSupplierOrder(fx.owner, second.id)
    const queue = await listSupplierOrders(fx.managerA, {
      warehouseId: fx.a.id,
      status: 'Pedido',
    })
    expect(queue.map((row) => row.id)).toEqual([first.id])
    expect(queue[0]).toMatchObject({
      supplierName: 'Alpura',
      status: 'Pedido',
      lineCount: 2,
      totalCostCents: 17472,
    })
    const all = await listSupplierOrders(fx.managerA, { warehouseId: fx.a.id })
    expect(all.map((row) => row.id).sort()).toEqual(
      [first.id, second.id].sort(),
    )
    const denied = await errorOf(() =>
      listSupplierOrders(fx.clerkA, { warehouseId: fx.a.id }),
    )
    expect([denied.code, denied.message]).toEqual(['forbidden', forbidden])
  })

  test('catalog cost changes after ordering do not alter the order', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await updateProduct(fx.owner, fx.milk.id, { listPricePerPiece: 20000 })
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { goodBoxes: 10, damagedBoxes: 0 },
        { goodBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(result.lots[0].receivedCostCents).toBe(13440)
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { presentations, products } from '#/modules/catalog/db/schema'
import { updateProduct } from '#/modules/catalog/services/products'
import {
  lots,
  purchaseLines,
  purchases,
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
  boxOf,
  errorOf,
  lineFor,
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
  lines: [lineFor(fx.milk, 10), lineFor(fx.soda, 2)],
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
  test('stores a Pedido from the catalog list price, netting the discounts, and moves no stock', async () => {
    const fx = await setupSupplierOrders()
    const created = await createSupplierOrder(fx.managerA, orderOf(fx))
    expect(created).toEqual({ id: expect.any(String), discountCents: 0 })
    const order = await getSupplierOrder(fx.managerA, created.id)
    expect(order).toMatchObject({
      status: 'Pedido',
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      expectedOn: '2026-11-10',
      reference: 'E001',
      receivedAt: null,
      receivedBy: null,
    })
    expect(order.lines).toHaveLength(2)
    expect(order.lines[0]).toMatchObject({
      productId: fx.milk.id,
      boxes: 10,
      quantity: 120,
      totalCostCents: 13440,
      grossCostCents: 14400,
      listPricePerPiece: 12000,
      fixedDiscountPerPiece: 500,
      promotionPerPiece: 300,
      goodQuantity: null,
      damagedQuantity: null,
    })
    expect(order.lines[1]).toMatchObject({
      productId: fx.soda.id,
      quantity: 48,
      totalCostCents: 4032,
      grossCostCents: 4032,
      listPricePerPiece: 8400,
      fixedDiscountPerPiece: 0,
      promotionPerPiece: 0,
    })
    const state = await supplierState()
    expect(state.inventory.lots).toEqual([])
    expect(state.inventory.movements).toBe(0)
    expect(state.pendings).toEqual([])
  })

  test('a product with a zero list price orders at no cost', async () => {
    const fx = await setupSupplierOrders()
    const created = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [lineFor(fx.free, 3)] }),
    )
    const order = await getSupplierOrder(fx.owner, created.id)
    expect(order.lines[0]).toMatchObject({
      quantity: 18,
      totalCostCents: 0,
      grossCostCents: 0,
      listPricePerPiece: 0,
    })
  })

  test('the discount is rounded once on the whole line, half up', async () => {
    const fx = await setupSupplierOrders()
    await updateProduct(fx.owner, fx.free.id, {
      listPricePerPiece: 56,
      fixedDiscountPerPiece: 25,
      promotionPerPiece: 0,
    })
    // Gross: 18 pieces × 0.0056 = 10.08 cents → 10. Discount: 18 × 0.0025 = 0.0450 → 4.5 cents → 5;
    // per box (2.5 → 3) × 3 would be 9.
    const created = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [lineFor(fx.free, 3)] }),
    )
    const order = await getSupplierOrder(fx.owner, created.id)
    expect(order.lines[0]).toMatchObject({
      totalCostCents: 5,
      grossCostCents: 10,
      costPerBoxCents: 2,
    })
  })

  test('the worked example: 192 boxes of 12 at 33.4201 a piece net 71562.47', async () => {
    const fx = await setupSupplierOrders()
    await updateProduct(fx.owner, fx.milk.id, {
      listPricePerPiece: 334201,
      fixedDiscountPerPiece: 800,
      promotionPerPiece: 22800,
    })
    const created = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [lineFor(fx.milk, 192)] }),
    )
    const order = await getSupplierOrder(fx.owner, created.id)
    // 2304 pieces × 33.4201 = 76999.91 gross; discounts 2304 × 2.36 = 5437.44.
    expect(order.lines[0]).toMatchObject({
      quantity: 2304,
      grossCostCents: 7_699_991,
      listPricePerPiece: 334201,
      totalCostCents: 7_156_247,
      costPerBoxCents: 37272,
    })
  })

  test('a discount and promotion equal to the list price cost nothing', async () => {
    const fx = await setupSupplierOrders()
    await updateProduct(fx.owner, fx.milk.id, { listPricePerPiece: 800 })
    // 24 pieces × 0.0800 = 1.92 gross and 1.92 of discount.
    const created = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [lineFor(fx.milk, 2)] }),
    )
    const order = await getSupplierOrder(fx.owner, created.id)
    expect(order.lines[0]).toMatchObject({
      grossCostCents: 192,
      totalCostCents: 0,
    })
  })

  test('rejects a product whose discount and promotion exceed its list price', async () => {
    const fx = await setupSupplierOrders()
    // Legacy state the catalog rules no longer allow: milk carries 0.0800 of discounts but a zero list price.
    await db
      .update(products)
      .set({ listPricePerPiece: 0 })
      .where(eq(products.id, fx.milk.id))
    await rejectsCreate(
      fx,
      orderOf(fx, { lines: [lineFor(fx.milk, 1)] }),
      'invalid',
      'El descuento y la promoción no pueden superar el costo por pieza.',
    )
  })

  test('the order takes boxes only: a typed cost is ignored and the catalog price rules', async () => {
    const fx = await setupSupplierOrders()
    const created = await createSupplierOrder(
      fx.owner,
      orderOf(fx, {
        lines: [{ ...lineFor(fx.milk, 1), grossCostCents: 1 }],
      }),
    )
    const order = await getSupplierOrder(fx.owner, created.id)
    expect(order.lines[0]).toMatchObject({
      grossCostCents: 1440,
      listPricePerPiece: 12000,
      totalCostCents: 1344,
    })
  })

  test('rejects a line whose derived cost does not fit and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    // 120,000,000 pieces fit, but 12,000,000,000 cents of gross cost do not.
    await rejectsCreate(
      fx,
      orderOf(fx, { lines: [lineFor(fx.milk, 10_000_000)] }),
      'invalid',
      'El pedido es demasiado grande.',
    )
  })

  test('rejects invalid orders and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    const cases: Array<[Record<string, unknown>, AppErrorCode, string]> = [
      [
        { lines: [lineFor(fx.cola, 1)] },
        'invalid',
        'Ese producto no pertenece a este proveedor.',
      ],
      [{ lines: [] }, 'invalid', 'Agrega al menos un producto al pedido.'],
      [
        {
          lines: [lineFor(fx.milk, 1), lineFor(fx.milk, 2)],
        },
        'invalid',
        'Cada producto solo puede aparecer una vez en el pedido.',
      ],
      [
        { lines: [lineFor(fx.milk, 0)] },
        'invalid',
        'Las cajas deben ser un número entero mayor que cero.',
      ],
      [
        { lines: [lineFor(fx.milk, 1.5)] },
        'invalid',
        'Las cajas deben ser un número entero mayor que cero.',
      ],
      [
        { lines: [lineFor(fx.milk, 999_999_999)] },
        'invalid',
        'El pedido es demasiado grande.',
      ],
      [
        { lines: [{ ...lineFor(fx.milk, 1), productId: crypto.randomUUID() }] },
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
        receivedBoxes: line.boxes,
        damagedBoxes: 0,
        noExpiry: true,
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
      lines: [lineFor(fx.milk, boxes), lineFor(fx.soda, 2)],
    }),
  )
  return getSupplierOrder(fx.owner, created.id)
}

const arrive = (
  order: Awaited<ReturnType<typeof pendingOrder>>,
  perLine: Array<{ receivedBoxes: number; damagedBoxes: number }>,
  extra: Record<string, unknown> = {},
) => ({
  purchaseId: order.id,
  lines: order.lines.map((line, index) => ({
    lineId: line.id,
    noExpiry: true,
    ...perLine[index],
  })),
  ...extra,
})

describe('receiveSupplierOrder', () => {
  test('creates one lot per line with good boxes at the catalog cost and standard price rule', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
    ])
    input.lines[0] = {
      ...input.lines[0],
      expiresOn: '2026-12-01',
    } as (typeof input.lines)[number]
    const result = await receiveSupplierOrder(fx.managerA, input)
    expect(result.lots).toHaveLength(2)
    const [milkLot, sodaLot] = result.lots
    expect(milkLot).toMatchObject({
      productId: fx.milk.id,
      warehouseId: fx.a.id,
      code: 'E001',
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
      lotCode: 'E001',
    })
    expect((await supplierState()).pendings).toEqual([])
  })

  test('records damaged and missing boxes as pendings and brings in only the good ones', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 7, damagedBoxes: 2 },
        { receivedBoxes: 2, damagedBoxes: 2 },
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

  test('receiving the ordered boxes enters them all and leaves nothing owed', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 10, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(result.lots.map((lot) => lot.receivedQuantity)).toEqual([120, 48])
    expect((await supplierState()).pendings).toEqual([])
  })

  test('receiving fewer boxes leaves the difference as a Por reponer balance', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 7, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(result.lots).toHaveLength(2)
    expect(result.lots[0]).toMatchObject({
      receivedQuantity: 84,
      receivedCostCents: 9408,
    })
    const pendings = (await supplierState()).pendings
    expect(pendings).toHaveLength(1)
    expect(pendings[0]).toMatchObject({
      productId: fx.milk.id,
      type: 'missing',
      quantity: 36,
      valueCents: 4032,
    })
  })

  test('receiving more boxes enters the extra stock without raising what is owed', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 12, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    // The two surplus boxes enter the same lot without cost: the lot is worth what was paid.
    expect(result.lots[0]).toMatchObject({
      receivedQuantity: 144,
      onHand: 144,
      receivedCostCents: 13440,
    })
    const stored = await getSupplierOrder(fx.owner, order.id)
    // What is owed to the supplier stays computed on the ordered boxes.
    expect(stored.totalCostCents).toBe(order.totalCostCents)
    expect(stored.lines[0].totalCostCents).toBe(order.lines[0].totalCostCents)
    expect(stored.lines[0]).toMatchObject({
      goodQuantity: 120,
      damagedQuantity: 0,
      missingQuantity: 0,
    })
    expect((await supplierState()).pendings).toEqual([])
  })

  test('damaged boxes fall on the free surplus first: only paid boxes are owed back', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 12, damagedBoxes: 3 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    // 12 arrived, 3 damaged: 9 good boxes; 2 of the damaged were the free ones.
    expect(result.lots[0]).toMatchObject({
      receivedQuantity: 108,
      receivedCostCents: 12096,
    })
    const pendings = (await supplierState()).pendings
    expect(pendings).toHaveLength(1)
    expect(pendings[0]).toMatchObject({
      type: 'damaged',
      quantity: 12,
      valueCents: 1344,
    })
    const stored = await getSupplierOrder(fx.owner, order.id)
    expect(stored.totalCostCents).toBe(order.totalCostCents)
    expect(stored.lines[0]).toMatchObject({
      goodQuantity: 108,
      damagedQuantity: 12,
      missingQuantity: 0,
    })
  })

  test('more damaged boxes than ordered are fine while they fit in what arrived', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const factor = order.lines[1].quantity / 2
    // 2 ordered, 4 arrived, 3 damaged: 2 free damaged, 1 paid damaged, 1 good.
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 10, damagedBoxes: 0 },
        { receivedBoxes: 4, damagedBoxes: 3 },
      ]),
    )
    expect(result.lots[1]).toMatchObject({ receivedQuantity: factor })
    const pendings = (await supplierState()).pendings
    expect(pendings).toHaveLength(1)
    expect(pendings[0]).toMatchObject({ type: 'damaged', quantity: factor })
    const stored = await getSupplierOrder(fx.owner, order.id)
    expect(stored.lines[1]).toMatchObject({
      goodQuantity: factor,
      damagedQuantity: factor,
      missingQuantity: 0,
    })
  })

  test('rejects damaged boxes above the received ones and changes nothing', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(
        fx.owner,
        arrive(order, [
          { receivedBoxes: 4, damagedBoxes: 5 },
          { receivedBoxes: 2, damagedBoxes: 0 },
        ]),
      ),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'Las cajas dañadas no pueden superar las cajas recibidas.',
    ])
    expect(await supplierState()).toEqual(before)
    expect((await getSupplierOrder(fx.owner, order.id)).status).toBe('Pedido')
  })

  test('rounds pending values once, half up', async () => {
    const fx = await setupSupplierOrders()
    // 3 boxes cost 4032 + ... use soda: 2016 per box; 1 box of 24 pieces, 7 damaged pieces cannot occur;
    // an odd line cost proves the single rounding: 5 boxes of milk, 1 damaged = 1344 exactly.
    const order = await pendingOrder(fx, 5)
    await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 5, damagedBoxes: 1 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    const rows = await db.select().from(supplierPendings)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'damaged', valueCents: 1344 })
  })

  test('every lot of the order takes its folio as the code', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 10, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(order.code).toBe('E001')
    expect(result.lots.map((lot) => lot.code)).toEqual(['E001', 'E001'])
  })

  test('the folio is automatic and consecutive: E001, E002…, shared by the lots of each order', async () => {
    const fx = await setupSupplierOrders()
    const first = await createSupplierOrder(fx.owner, orderOf(fx))
    const second = await createSupplierOrder(
      fx.managerA,
      orderOf(fx, { reference: 'X-99' }),
    )
    const [a, b] = [
      await getSupplierOrder(fx.owner, first.id),
      await getSupplierOrder(fx.owner, second.id),
    ]
    expect([a.reference, a.code]).toEqual(['E001', 'E001'])
    // A folio typed by the client is ignored: the folio is not editable.
    expect([b.reference, b.code]).toEqual(['E002', 'E002'])
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(b, [
        { receivedBoxes: 10, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(result.lots.map((lot) => lot.code)).toEqual(['E002', 'E002'])
    const stored = await getSupplierOrder(fx.owner, b.id)
    expect(stored.lines.map((line) => line.lotCode)).toEqual(['E002', 'E002'])
    const listed = await listSupplierOrders(fx.owner, { warehouseId: fx.a.id })
    expect(listed.find((row) => row.id === b.id)?.code).toBe('E002')
  })

  test('the folio continues after the highest E folio already stored', async () => {
    const fx = await setupSupplierOrders()
    const first = await createSupplierOrder(fx.owner, orderOf(fx))
    await db
      .update(purchases)
      .set({ reference: 'E041' })
      .where(eq(purchases.id, first.id))
    const next = await createSupplierOrder(fx.owner, orderOf(fx))
    expect((await getSupplierOrder(fx.owner, next.id)).code).toBe('E042')
  })

  test('all zero exceptions mean everything arrived well; the expiry goes to the line lot', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
    ])
    input.lines[1] = {
      ...input.lines[1],
      expiresOn: '2027-01-15',
    } as (typeof input.lines)[number]
    const result = await receiveSupplierOrder(fx.owner, input)
    expect(result.lots.map((lot) => lot.receivedQuantity)).toEqual([120, 48])
    expect(result.lots.map((lot) => lot.expiresOn)).toEqual([
      null,
      '2027-01-15',
    ])
    expect((await supplierState()).pendings).toEqual([])
  })

  test('every line with good boxes declares an expiry or explicitly none', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const undeclared = {
      purchaseId: order.id,
      lines: order.lines.map((line) => ({
        lineId: line.id,
        receivedBoxes: line.boxes,
        damagedBoxes: 0,
      })),
    }
    const before = await supplierState()
    const error = await errorOf(() =>
      receiveSupplierOrder(fx.owner, undeclared),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'Indica la caducidad de cada producto que entra o marca «Sin caducidad».',
    ])
    expect(await supplierState()).toEqual(before)
    // A line where nothing good arrived needs no expiry.
    const result = await receiveSupplierOrder(fx.owner, {
      purchaseId: order.id,
      lines: [
        { ...undeclared.lines[0], expiresOn: '2027-02-01' },
        { ...undeclared.lines[1], damagedBoxes: 2 },
      ],
    })
    expect(result.lots.map((lot) => lot.expiresOn)).toEqual(['2027-02-01'])
  })

  test('stock that enters already expired needs an explicit confirmation flag', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const expired = arrive(order, [
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
    ])
    expired.lines[0] = {
      ...expired.lines[0],
      noExpiry: undefined,
      expiresOn: '2020-01-01',
    } as never
    const before = await supplierState()
    for (const input of [expired, { ...expired, confirmExpired: false }]) {
      const error = await errorOf(() => receiveSupplierOrder(fx.owner, input))
      expect([error.code, error.message]).toEqual([
        'conflict',
        'Hay productos que entran con la caducidad vencida. Confirma la recepción para aceptarlos.',
      ])
      expect(await supplierState()).toEqual(before)
    }
    const result = await receiveSupplierOrder(fx.owner, {
      ...expired,
      confirmExpired: true,
    })
    expect(result.lots.map((lot) => lot.expiresOn)).toEqual([
      '2020-01-01',
      null,
    ])
  })

  test('expired boxes that do not enter stock need no confirmation', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { receivedBoxes: 0, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 2 },
    ])
    input.lines[0] = {
      ...input.lines[0],
      expiresOn: '2020-01-01',
    } as (typeof input.lines)[number]
    const result = await receiveSupplierOrder(fx.owner, input)
    expect(result.lots).toEqual([])
  })

  test('an expired replacement also needs the confirmation flag', async () => {
    const fx = await setupSupplierOrders()
    const first = await pendingOrder(fx)
    await receiveSupplierOrder(
      fx.owner,
      arrive(first, [
        { receivedBoxes: 8, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    const owed = (await supplierState()).pendings.find(
      (row) => row.type === 'missing',
    )!
    const second = await pendingOrder(fx)
    const input = arrive(
      second,
      [
        { receivedBoxes: 0, damagedBoxes: 0 },
        { receivedBoxes: 0, damagedBoxes: 0 },
      ],
      {
        replacements: [
          { pendingId: owed.id, boxes: 1, expiresOn: '2020-01-01' },
        ],
      },
    )
    const before = await supplierState()
    const error = await errorOf(() => receiveSupplierOrder(fx.owner, input))
    expect(error.code).toBe('conflict')
    expect(await supplierState()).toEqual(before)
    await receiveSupplierOrder(fx.owner, { ...input, confirmExpired: true })
  })

  test('a line can be all missing or all damaged: no lot and the whole line is owed', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 0, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 2 },
      ]),
    )
    expect(result.lots).toEqual([])
    expect(await db.select().from(lots)).toHaveLength(0)
    const pendings = (await supplierState()).pendings
    expect(pendings.map((row) => [row.type, row.quantity]).sort()).toEqual([
      ['damaged', 48],
      ['missing', 120],
    ])
  })

  test('rejects wrong reception input and leaves everything unchanged', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const ok = [
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
    ]
    const cases: Array<[Record<string, unknown>, AppErrorCode, string]> = [
      [
        arrive(order, [{ receivedBoxes: 2, damagedBoxes: 3 }, ok[1]]),
        'invalid',
        'Las cajas dañadas no pueden superar las cajas recibidas.',
      ],
      [
        arrive(order, [{ receivedBoxes: -1, damagedBoxes: 0 }, ok[1]]),
        'invalid',
        'Las cajas recibidas y dañadas deben ser enteros de cero o más.',
      ],
      [
        arrive(order, [{ receivedBoxes: 10, damagedBoxes: 1.5 }, ok[1]]),
        'invalid',
        'Las cajas recibidas y dañadas deben ser enteros de cero o más.',
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
            {
              lineId: crypto.randomUUID(),
              receivedBoxes: 0,
              damagedBoxes: 0,
              noExpiry: true,
            },
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
          replacements: [
            { pendingId: crypto.randomUUID(), boxes: 1, noExpiry: true },
          ],
        }),
        'not_found',
        'No encontramos ese saldo.',
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
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
    ])
    const before = await supplierState()
    for (const actor of [fx.managerB]) {
      const error = await errorOf(() => receiveSupplierOrder(actor, input))
      expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    }
    expect(await supplierState()).toEqual(before)
  })

  test('refuses to receive an order twice or a cancelled one', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    const input = arrive(order, [
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
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
          { receivedBoxes: 10, damagedBoxes: 0 },
          { receivedBoxes: 2, damagedBoxes: 0 },
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
      { receivedBoxes: 10, damagedBoxes: 0 },
      { receivedBoxes: 2, damagedBoxes: 0 },
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
        { receivedBoxes: 10, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
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
      listSupplierOrders(fx.managerB, { warehouseId: fx.a.id }),
    )
    expect([denied.code, denied.message]).toEqual(['forbidden', forbidden])
  })

  test('catalog price, discount and promotion changes after ordering do not alter the order', async () => {
    const fx = await setupSupplierOrders()
    const order = await pendingOrder(fx)
    await updateProduct(fx.owner, fx.milk.id, {
      listPricePerPiece: 20000,
      fixedDiscountPerPiece: 0,
      promotionPerPiece: 0,
    })
    expect(
      (await getSupplierOrder(fx.owner, order.id)).lines.find(
        (line) => line.productId === fx.milk.id,
      ),
    ).toMatchObject({
      grossCostCents: 14400,
      listPricePerPiece: 12000,
      fixedDiscountPerPiece: 500,
      promotionPerPiece: 300,
    })
    const result = await receiveSupplierOrder(
      fx.owner,
      arrive(order, [
        { receivedBoxes: 10, damagedBoxes: 0 },
        { receivedBoxes: 2, damagedBoxes: 0 },
      ]),
    )
    expect(result.lots[0].receivedCostCents).toBe(13440)
  })
})

describe('migration 0019: legacy lines get the box factor of their product', () => {
  /** The data-fix statement of the migration file, run as shipped. */
  const fixLegacyBoxFactors = () => {
    const file = readFileSync(
      new URL(
        '../../../../drizzle/0019_order_line_list_price.sql',
        import.meta.url,
      ),
      'utf8',
    )
    const statement = file
      .split('--> statement-breakpoint')
      .find((part) => part.includes('UPDATE "purchase_lines"'))!
    return db.execute(sql.raw(statement))
  }

  test('divisible quantities get the default presentation factor, others stay at 1', async () => {
    const fx = await setupSupplierOrders()
    const purchase = (productId: string, quantity: number) =>
      createPurchase(fx.managerA, {
        supplierId: fx.supplier.id,
        warehouseId: fx.a.id,
        purchasedOn: '2026-11-01',
        lines: [{ productId, quantity, totalCostCents: 1000 }],
      })
    const milk = await purchase(fx.milk.id, 36) // 3 boxes of 12
    const odd = await purchase(fx.milk.id, 25) // not a whole number of boxes
    const soda = await purchase(fx.soda.id, 48) // 2 boxes of 24
    const single = await purchase(fx.free.id, 6) // 1 box of 6
    // As stored before box factors existed.
    await db.update(purchaseLines).set({ boxFactor: 1 })
    await fixLegacyBoxFactors()
    const factors = async (id: string) =>
      (await getSupplierOrder(fx.owner, id)).lines.map((line) => [
        line.boxFactor,
        line.boxes,
      ])
    expect(await factors(milk.id)).toEqual([[12, 3]])
    expect(await factors(odd.id)).toEqual([[1, 25]])
    expect(await factors(soda.id)).toEqual([[24, 2]])
    expect(await factors(single.id)).toEqual([[6, 1]])
  })

  test('lines that already have a factor, and products sold by piece, are untouched', async () => {
    const fx = await setupSupplierOrders()
    const order = await createSupplierOrder(fx.owner, orderOf(fx))
    const plain = await createPurchase(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [{ productId: fx.milk.id, quantity: 24, totalCostCents: 100 }],
    })
    await db
      .update(purchaseLines)
      .set({ boxFactor: 1 })
      .where(eq(purchaseLines.purchaseId, plain.id))
    const before = await db
      .select()
      .from(purchaseLines)
      .orderBy(asc(purchaseLines.id))
    await fixLegacyBoxFactors()
    const after = await db
      .select()
      .from(purchaseLines)
      .orderBy(asc(purchaseLines.id))
    const changed = after.filter(
      (line, index) => line.boxFactor !== before[index].boxFactor,
    )
    expect(changed.map((line) => line.purchaseId)).toEqual([plain.id])
    expect(
      (await getSupplierOrder(fx.owner, order.id)).lines.map(
        (line) => line.boxFactor,
      ),
    ).toEqual([12, 24])
  })
})

describe('migration 0020: legacy lines get a gross cost', () => {
  /** The data statement of the migration file, run as shipped on the pre-migration column. */
  const convert = () => {
    const file = readFileSync(
      new URL(
        '../../../../drizzle/0020_order_line_gross_cost.sql',
        import.meta.url,
      ),
      'utf8',
    )
    return file
      .split('--> statement-breakpoint')
      .find((part) => part.includes('UPDATE "purchase_lines"'))!
  }

  test('derives the gross cost from the list price, else from the net cost plus discounts', async () => {
    const fx = await setupSupplierOrders()
    await createSupplierOrder(fx.owner, orderOf(fx))
    await createPurchase(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [{ productId: fx.free.id, quantity: 18, totalCostCents: 1000 }],
    })
    const rollback = new Error('rollback')
    const gross = await db
      .transaction(async (tx) => {
        // The column exists again since 0026; restore the shape before 0020.
        await tx.execute(
          sql`ALTER TABLE purchase_lines DROP COLUMN list_price_per_piece`,
        )
        await tx.execute(
          sql`ALTER TABLE purchase_lines ADD COLUMN list_price_per_piece integer NOT NULL DEFAULT 0`,
        )
        // Pre-migration shape: milk was ordered at list 1.2000; soda and the direct purchase had none.
        await tx.execute(
          sql`UPDATE purchase_lines SET gross_cost_cents = 0, list_price_per_piece = 0`,
        )
        await tx
          .update(purchaseLines)
          .set({ fixedDiscountPerPiece: 25 })
          .where(eq(purchaseLines.productId, fx.free.id))
        await tx.execute(
          sql`UPDATE purchase_lines SET list_price_per_piece = 12000 WHERE product_id = ${fx.milk.id}`,
        )
        await tx.execute(sql.raw(convert()))
        const rows = await tx
          .select({
            productId: purchaseLines.productId,
            gross: purchaseLines.grossCostCents,
          })
          .from(purchaseLines)
        throw Object.assign(rollback, {
          gross: Object.fromEntries(
            rows.map((row) => [row.productId, row.gross]),
          ),
        })
      })
      .catch((failure: Error & { gross?: Record<string, number> }) => {
        if (failure !== rollback) throw failure
        return failure.gross
      })
    expect(gross).toEqual({
      [fx.milk.id]: 14400, // 120 pieces × 1.2000
      [fx.soda.id]: 4032, // net cost, no discounts
      [fx.free.id]: 1005, // 1000 + round(18 × 0.0025 = 4.5 cents) → 5
    })
  })
})

describe('migration 0026: list price per piece on products and lines', () => {
  /** The data statements of the migration file, run as shipped. */
  const backfill = () => {
    const file = readFileSync(
      new URL('../../../../drizzle/0026_piece_list_price.sql', import.meta.url),
      'utf8',
    )
    return file
      .split('--> statement-breakpoint')
      .filter((part) => /UPDATE "(products|purchase_lines)"/.test(part))
  }

  /** Lines and products as they were before 0026: no stored list price. */
  async function backfilled<T>(read: (tx: typeof db) => Promise<T>) {
    const rollback = new Error('rollback')
    return db
      .transaction(async (tx) => {
        await tx.execute(sql`UPDATE products SET list_price_per_piece = 0`)
        await tx.execute(
          sql`UPDATE purchase_lines SET list_price_per_piece = 0`,
        )
        for (const statement of backfill()) {
          await tx.execute(sql.raw(statement))
        }
        throw Object.assign(rollback, { result: await read(tx as never) })
      })
      .catch((failure: Error & { result?: T }) => {
        if (failure !== rollback) throw failure
        return failure.result as T
      })
  }

  test('lines get gross × 100 ÷ pieces half up; products take it from their latest non-cancelled line', async () => {
    const fx = await setupSupplierOrders()
    const older = await createSupplierOrder(fx.owner, orderOf(fx))
    const newer = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [lineFor(fx.milk, 10), lineFor(fx.free, 3)] }),
    )
    const cancelled = await createSupplierOrder(
      fx.owner,
      orderOf(fx, { lines: [lineFor(fx.milk, 1)] }),
    )
    await cancelSupplierOrder(fx.owner, cancelled.id)
    await db
      .update(purchases)
      .set({ purchasedOn: '2026-10-01' })
      .where(eq(purchases.id, older.id))
    await db
      .update(purchases)
      .set({ purchasedOn: '2026-10-15' })
      .where(eq(purchases.id, newer.id))
    await db
      .update(purchases)
      .set({ purchasedOn: '2026-10-30' })
      .where(eq(purchases.id, cancelled.id))
    // Gross costs as stored by 0020; the older milk line was ordered at 1.0000 a piece.
    await db.execute(
      sql`UPDATE purchase_lines SET gross_cost_cents = 12000 WHERE purchase_id = ${older.id} AND product_id = ${fx.milk.id}`,
    )
    await db.execute(
      sql`UPDATE purchase_lines SET gross_cost_cents = 10 WHERE purchase_id = ${newer.id} AND product_id = ${fx.free.id}`,
    )
    await db.execute(
      sql`UPDATE purchase_lines SET gross_cost_cents = 999 WHERE purchase_id = ${cancelled.id}`,
    )
    const result = await backfilled(async (tx) => ({
      lines: await tx
        .select({
          purchaseId: purchaseLines.purchaseId,
          productId: purchaseLines.productId,
          list: purchaseLines.listPricePerPiece,
        })
        .from(purchaseLines),
      products: await tx
        .select({ id: products.id, list: products.listPricePerPiece })
        .from(products),
    }))
    const listOf = (purchaseId: string, productId: string) =>
      result.lines.find(
        (line) =>
          line.purchaseId === purchaseId && line.productId === productId,
      )?.list
    expect(listOf(older.id, fx.milk.id)).toBe(10000) // 12000 × 100 ÷ 120
    expect(listOf(older.id, fx.soda.id)).toBe(8400) // 4032 × 100 ÷ 48
    expect(listOf(newer.id, fx.free.id)).toBe(56) // 10 × 100 ÷ 18 = 55.56 → 56
    expect(listOf(cancelled.id, fx.milk.id)).toBe(8325) // 999 × 100 ÷ 12
    const productList = Object.fromEntries(
      result.products.map((row) => [row.id, row.list]),
    )
    // Milk: the newest line that is not cancelled (the 2026-10-15 order, 14400 gross).
    expect(productList[fx.milk.id]).toBe(12000)
    expect(productList[fx.soda.id]).toBe(8400)
    expect(productList[fx.free.id]).toBe(56)
    // No lines at all: zero.
    expect(productList[fx.cola.id]).toBe(0)
  })
})

describe('box factor of an order line', () => {
  test('is the default presentation even when it is inactive', async () => {
    const fx = await setupSupplierOrders()
    await db
      .update(presentations)
      .set({ active: false })
      .where(eq(presentations.id, boxOf(fx.milk).id))
    const order = await createSupplierOrder(fx.owner, orderOf(fx))
    const detail = await getSupplierOrder(fx.owner, order.id)
    expect(
      detail.lines.find((line) => line.productId === fx.milk.id)?.boxFactor,
    ).toBe(boxOf(fx.milk).factor)
  })
})

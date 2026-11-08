import { beforeEach, describe, expect, test } from 'bun:test'
import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import { createOrder } from '#/modules/orders/services/orders'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'
import {
  errorOf,
  ledgerSum,
  onHandOf,
  receive,
  setupTransfers,
  transferState,
} from '#/modules/transfers/services/testing'

beforeEach(() => resetDatabase(db))

type Fx = Awaited<ReturnType<typeof setupTransfers>>
const send = (fx: Fx, quantity: number, actor = fx.managerA) =>
  dispatchTransfer(actor, {
    fromWarehouseId: fx.a.id,
    toWarehouseId: fx.b.id,
    items: [{ productId: fx.milkBox.id, quantity }],
  })

async function rejects(
  run: () => Promise<unknown>,
  code: AppErrorCode,
  message: string,
) {
  const before = await transferState()
  const error = await errorOf(run)
  expect(error.code).toBe(code)
  expect(error.message).toBe(message)
  expect(await transferState()).toEqual(before)
}

describe('dispatchTransfer', () => {
  test('takes units FEFO across lots, appends transfer_out and leaves the transfer in transit', async () => {
    const fx = await setupTransfers()
    const late = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: '2099-01-01',
    })
    const early = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 4,
      expiresOn: '2098-01-01',
    })
    const { id } = await send(fx, 6)
    expect(await onHandOf(early.id)).toBe(0)
    expect(await onHandOf(late.id)).toBe(8)
    const [transfer] = await db.select().from(transfers)
    expect(transfer).toMatchObject({
      id,
      status: 'En tránsito',
      fromWarehouseId: fx.a.id,
      toWarehouseId: fx.b.id,
      createdBy: fx.managerA.userId,
    })
    const lines = await db
      .select()
      .from(transferLines)
      .orderBy(asc(transferLines.quantity))
    expect(lines.map((line) => [line.sourceLotId, line.quantity])).toEqual([
      [late.id, 2],
      [early.id, 4],
    ])
    const out = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'transfer_out'))
    expect(out.map((m) => m.quantity).sort()).toEqual([-2, -4])
    expect(out.every((m) => m.reference === id)).toBe(true)
    expect(await ledgerSum(early.id)).toBe(0)
    expect(await ledgerSum(late.id)).toBe(8)
    // Nothing exists in B until it is received.
    expect(
      await db.select().from(lots).where(eq(lots.warehouseId, fx.b.id)),
    ).toHaveLength(0)
  })

  test('merges repeated products into one request', async () => {
    const fx = await setupTransfers()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await dispatchTransfer(fx.managerA, {
      fromWarehouseId: fx.a.id,
      toWarehouseId: fx.b.id,
      items: [
        { productId: fx.milkBox.id, quantity: 3 },
        { productId: fx.milkBox.id, quantity: 4 },
      ],
    })
    expect(await onHandOf(lot.id)).toBe(3)
  })

  test('rejects more than the available units and changes nothing', async () => {
    const fx = await setupTransfers()
    await receive(fx, { productId: fx.milkBox.id, quantity: 5 })
    await receive(fx, { productId: fx.milkBox.id, quantity: 4 })
    await rejects(
      () => send(fx, 10),
      'conflict',
      'No hay suficiente existencia disponible de Leche entera 1L.',
    )
  })

  test('does not take reserved units', async () => {
    const fx = await setupTransfers()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 7 }],
    })
    await rejects(
      () => send(fx, 4),
      'conflict',
      'No hay suficiente existencia disponible de Leche entera 1L.',
    )
    await send(fx, 3)
    expect(await onHandOf(lot.id)).toBe(7)
  })

  test('does not take expired units', async () => {
    const fx = await setupTransfers()
    const expired = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      expiresOn: '2020-01-01',
    })
    const fresh = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 3,
      expiresOn: '2099-01-01',
    })
    await rejects(
      () => send(fx, 4),
      'conflict',
      'No hay suficiente existencia disponible de Leche entera 1L.',
    )
    await send(fx, 3)
    expect(await onHandOf(expired.id)).toBe(10)
    expect(await onHandOf(fresh.id)).toBe(0)
  })

  test('units held by an order that already expired are available again', async () => {
    const fx = await setupTransfers()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    const { useClock } = await import('#/modules/orders/services/testing')
    await createOrder(fx.staffA, {
      warehouseId: fx.a.id,
      customerId: fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity: 10 }],
    })
    useClock(() => new Date(Date.now() + 48 * 3_600_000))
    try {
      await send(fx, 10)
    } finally {
      useClock(null)
    }
    expect(await onHandOf(lot.id)).toBe(0)
  })

  test('manager of the source dispatches; destination manager cannot', async () => {
    const fx = await setupTransfers()
    await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await rejects(
      () => send(fx, 1, fx.managerB),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    await send(fx, 1, fx.managerA)
    await send(fx, 1, fx.owner)
  })

  test('rejects the same warehouse as source and destination', async () => {
    const fx = await setupTransfers()
    await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    await rejects(
      () =>
        dispatchTransfer(fx.managerA, {
          fromWarehouseId: fx.a.id,
          toWarehouseId: fx.a.id,
          items: [{ productId: fx.milkBox.id, quantity: 1 }],
        }),
      'invalid',
      'El origen y el destino del traslado deben ser distintos.',
    )
  })

  test('rejects bad quantities, empty requests and unknown references', async () => {
    const fx = await setupTransfers()
    await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    const item = (quantity: number, productId = fx.milkBox.id) => ({
      productId,
      quantity,
    })
    const run = (
      items: Array<ReturnType<typeof item>>,
      toWarehouseId = fx.b.id,
    ) =>
      dispatchTransfer(fx.managerA, {
        fromWarehouseId: fx.a.id,
        toWarehouseId,
        items,
      })
    const mustBePositive = 'La cantidad debe ser mayor que cero.'
    await rejects(
      () => run([]),
      'invalid',
      'Agrega al menos un producto al traslado.',
    )
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      await rejects(() => run([item(bad)]), 'invalid', mustBePositive)
    }
    await rejects(
      () => run([item(2147483648)]),
      'invalid',
      'La cantidad no puede ser mayor que 2147483647.',
    )
    await rejects(
      () => run([item(1, crypto.randomUUID())]),
      'not_found',
      'No encontramos ese producto.',
    )
    await rejects(
      () => run([item(1)], crypto.randomUUID()),
      'not_found',
      'No encontramos ese almacén.',
    )
  })

  test('concurrent dispatches never take the same units twice', async () => {
    const fx = await setupTransfers()
    const lot = await receive(fx, { productId: fx.milkBox.id, quantity: 10 })
    const results = await Promise.allSettled([
      send(fx, 6),
      send(fx, 6),
      send(fx, 6),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await onHandOf(lot.id)).toBe(4)
    expect(await ledgerSum(lot.id)).toBe(4)
  })
})

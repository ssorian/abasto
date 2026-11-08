import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'
import { receiveTransfer } from '#/modules/transfers/services/transfer-receive'
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

/** Lot of `quantity` units (cost 1000 cents) in A, all of it in transit to B. */
async function inTransit(fx: Fx, quantity = 6, lotQuantity = 10) {
  const lot = await receive(fx, {
    productId: fx.milkBox.id,
    quantity: lotQuantity,
    totalCostCents: 1000,
    lotCode: 'L-77',
    expiresOn: '2099-03-01',
  })
  const { id } = await dispatchTransfer(fx.managerA, {
    fromWarehouseId: fx.a.id,
    toWarehouseId: fx.b.id,
    items: [{ productId: fx.milkBox.id, quantity }],
  })
  const [line] = await db
    .select()
    .from(transferLines)
    .where(eq(transferLines.transferId, id))
  return { lot, id, line }
}

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

describe('receiveTransfer', () => {
  test('the destination lot keeps the source lot sale price', async () => {
    const fx = await setupTransfers()
    const source = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 10,
      totalCostCents: 1000,
      salePriceCents: 150,
    })
    const { id } = await dispatchTransfer(fx.managerA, {
      fromWarehouseId: fx.a.id,
      toWarehouseId: fx.b.id,
      items: [{ productId: fx.milkBox.id, quantity: 4 }],
    })
    const [line] = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, id))
    await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 4 }],
    })
    const [created] = await db
      .select()
      .from(lots)
      .where(eq(lots.warehouseId, fx.b.id))
    expect(source.salePriceCents).toBe(150)
    expect(created.salePriceCents).toBe(150)
  })

  test('full receipt creates a lot in B with the same code, expiry and prorated cost', async () => {
    const fx = await setupTransfers()
    const { lot, id, line } = await inTransit(fx, 6, 10)
    const result = await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 6 }],
    })
    expect(result.status).toBe('Recibido')
    const [created] = await db
      .select()
      .from(lots)
      .where(eq(lots.warehouseId, fx.b.id))
    expect(created).toMatchObject({
      productId: fx.milkBox.id,
      code: 'L-77',
      expiresOn: '2099-03-01',
      onHand: 6,
      receivedQuantity: 6,
      receivedCostCents: 600,
      sourceLotId: lot.id,
      purchaseLineId: null,
      reserved: 0,
    })
    expect(await ledgerSum(created.id)).toBe(6)
    const [movement] = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.lotId, created.id))
    expect(movement).toMatchObject({
      type: 'transfer_in',
      quantity: 6,
      warehouseId: fx.b.id,
      reference: id,
      actorId: fx.managerB.userId,
    })
    const [stored] = await db.select().from(transfers)
    expect(stored).toMatchObject({
      status: 'Recibido',
      closedBy: fx.managerB.userId,
    })
    expect(stored.closedAt).not.toBeNull()
    const stock = await getWarehouseStock(fx.managerB, fx.b.id)
    expect(stock[0]).toMatchObject({ onHand: 6, available: 6 })
    expect(stock[0].lots[0]).toMatchObject({ code: 'L-77' })
  })

  test('a shortage is recorded and is stock nowhere', async () => {
    const fx = await setupTransfers()
    const { lot, id, line } = await inTransit(fx, 6, 10)
    const result = await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 4 }],
    })
    expect(result.status).toBe('Recibido con diferencia')
    const [created] = await db
      .select()
      .from(lots)
      .where(eq(lots.warehouseId, fx.b.id))
    expect(created.onHand).toBe(4)
    expect(created.receivedCostCents).toBe(400)
    expect(await onHandOf(lot.id)).toBe(4)
    const [stored] = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.id, line.id))
    expect(stored).toMatchObject({
      quantity: 6,
      receivedQuantity: 4,
      destinationLotId: created.id,
    })
  })

  test('nothing received creates no lot but still closes the transfer', async () => {
    const fx = await setupTransfers()
    const { id, line } = await inTransit(fx)
    const result = await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 0 }],
    })
    expect(result.status).toBe('Recibido con diferencia')
    expect(
      await db.select().from(lots).where(eq(lots.warehouseId, fx.b.id)),
    ).toHaveLength(0)
  })

  test('cost is prorated from the source lot and rounded half up once', async () => {
    const fx = await setupTransfers()
    const lot = await receive(fx, {
      productId: fx.milkBox.id,
      quantity: 3,
      totalCostCents: 1000,
    })
    const { id } = await dispatchTransfer(fx.managerA, {
      fromWarehouseId: fx.a.id,
      toWarehouseId: fx.b.id,
      items: [{ productId: fx.milkBox.id, quantity: 3 }],
    })
    const [line] = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, id))
    await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 2 }],
    })
    const [created] = await db
      .select()
      .from(lots)
      .where(eq(lots.sourceLotId, lot.id))
    // 1000 × 2 / 3 = 666.67 → 667
    expect(created.receivedCostCents).toBe(667)
  })

  test('a transferred lot can be transferred again keeping its unit cost', async () => {
    const fx = await setupTransfers()
    const { id, line } = await inTransit(fx, 6, 10)
    await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 6 }],
    })
    const second = await dispatchTransfer(fx.managerB, {
      fromWarehouseId: fx.b.id,
      toWarehouseId: fx.a.id,
      items: [{ productId: fx.milkBox.id, quantity: 3 }],
    })
    const [back] = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, second.id))
    await receiveTransfer(fx.managerA, {
      transferId: second.id,
      lines: [{ lineId: back.id, receivedQuantity: 3 }],
    })
    const returned = (
      await db.select().from(lots).where(eq(lots.sourceLotId, back.sourceLotId))
    )[0]
    expect(returned.receivedCostCents).toBe(300)
  })

  test('more than sent is rejected and changes nothing', async () => {
    const fx = await setupTransfers()
    const { id, line } = await inTransit(fx)
    await rejects(
      () =>
        receiveTransfer(fx.managerB, {
          transferId: id,
          lines: [{ lineId: line.id, receivedQuantity: 7 }],
        }),
      'invalid',
      'Lo recibido no puede ser mayor que lo enviado.',
    )
  })

  test('rejects negative, fractional, missing, duplicated and foreign lines', async () => {
    const fx = await setupTransfers()
    const { id, line } = await inTransit(fx)
    const run = (lines: Array<{ lineId: string; receivedQuantity: number }>) =>
      receiveTransfer(fx.managerB, { transferId: id, lines })
    for (const bad of [-1, 1.5, Number.NaN]) {
      await rejects(
        () => run([{ lineId: line.id, receivedQuantity: bad }]),
        'invalid',
        'La cantidad recibida debe ser un entero de cero o más.',
      )
    }
    const message = 'Indica la cantidad recibida de cada línea del traslado.'
    await rejects(() => run([]), 'invalid', message)
    await rejects(
      () =>
        run([
          { lineId: line.id, receivedQuantity: 1 },
          { lineId: line.id, receivedQuantity: 1 },
        ]),
      'invalid',
      message,
    )
    await rejects(
      () => run([{ lineId: crypto.randomUUID(), receivedQuantity: 1 }]),
      'invalid',
      message,
    )
  })

  test('receiving twice is rejected', async () => {
    const fx = await setupTransfers()
    const { id, line } = await inTransit(fx)
    const run = () =>
      receiveTransfer(fx.managerB, {
        transferId: id,
        lines: [{ lineId: line.id, receivedQuantity: 6 }],
      })
    await run()
    await rejects(run, 'conflict', 'Este traslado ya no está en tránsito.')
  })

  test('unknown transfer', async () => {
    const fx = await setupTransfers()
    const error = await errorOf(() =>
      receiveTransfer(fx.managerB, {
        transferId: crypto.randomUUID(),
        lines: [],
      }),
    )
    expect(error).toMatchObject({
      code: 'not_found',
      message: 'No encontramos ese traslado.',
    })
  })

  test('manager of the destination and the owner receive; source manager cannot', async () => {
    const fx = await setupTransfers()
    const { id, line } = await inTransit(fx)
    const input = {
      transferId: id,
      lines: [{ lineId: line.id, receivedQuantity: 6 }],
    }
    for (const actor of [fx.managerA]) {
      await rejects(
        () => receiveTransfer(actor, input),
        'forbidden',
        'No tienes permiso para esta acción.',
      )
    }
    await receiveTransfer(fx.owner, input)
    // Fresh transfer for the destination manager.
    const second = await dispatchTransfer(fx.managerA, {
      fromWarehouseId: fx.a.id,
      toWarehouseId: fx.b.id,
      items: [{ productId: fx.milkBox.id, quantity: 1 }],
    })
    const [secondLine] = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, second.id))
    await receiveTransfer(fx.managerB, {
      transferId: second.id,
      lines: [{ lineId: secondLine.id, receivedQuantity: 1 }],
    })
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { stockMovements } from '#/modules/inventory/db/schema'
import { transferLines, transfers } from '#/modules/transfers/db/schema'
import { cancelTransfer } from '#/modules/transfers/services/transfer-cancel'
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

async function twoLotsInTransit(fx: Fx) {
  const early = await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 4,
    expiresOn: '2098-01-01',
  })
  const late = await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 10,
    expiresOn: '2099-01-01',
  })
  const { id } = await dispatchTransfer(fx.managerA, {
    fromWarehouseId: fx.a.id,
    toWarehouseId: fx.b.id,
    items: [{ productId: fx.milkBox.id, quantity: 6 }],
  })
  return { early, late, id }
}

describe('cancelTransfer', () => {
  test('returns the units to their source lots with transfer_return movements', async () => {
    const fx = await setupTransfers()
    const { early, late, id } = await twoLotsInTransit(fx)
    await cancelTransfer(fx.managerA, { transferId: id })
    expect(await onHandOf(early.id)).toBe(4)
    expect(await onHandOf(late.id)).toBe(10)
    expect(await ledgerSum(early.id)).toBe(4)
    expect(await ledgerSum(late.id)).toBe(10)
    const returns = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'transfer_return'))
    expect(returns.map((m) => m.quantity).sort()).toEqual([2, 4])
    expect(returns.every((m) => m.reference === id)).toBe(true)
    const [stored] = await db.select().from(transfers)
    expect(stored).toMatchObject({
      status: 'Cancelado',
      closedBy: fx.managerA.userId,
    })
    expect(stored.closedAt).not.toBeNull()
  })

  test('cannot be cancelled after it was received, nor received after cancelling', async () => {
    const fx = await setupTransfers()
    const { id } = await twoLotsInTransit(fx)
    const lines = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, id))
    await receiveTransfer(fx.managerB, {
      transferId: id,
      lines: lines.map((line) => ({
        lineId: line.id,
        receivedQuantity: line.quantity,
      })),
    })
    const before = await transferState()
    const error = await errorOf(() =>
      cancelTransfer(fx.managerA, { transferId: id }),
    )
    expect(error).toMatchObject({
      code: 'conflict',
      message: 'Este traslado ya no está en tránsito.',
    })
    expect(await transferState()).toEqual(before)

    const second = await twoLotsInTransit(fx)
    await cancelTransfer(fx.managerA, { transferId: second.id })
    const secondLines = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, second.id))
    const afterCancel = await transferState()
    for (const run of [
      () => cancelTransfer(fx.managerA, { transferId: second.id }),
      () =>
        receiveTransfer(fx.managerB, {
          transferId: second.id,
          lines: secondLines.map((line) => ({
            lineId: line.id,
            receivedQuantity: line.quantity,
          })),
        }),
    ]) {
      expect((await errorOf(run)).code).toBe('conflict')
    }
    expect(await transferState()).toEqual(afterCancel)
  })

  test('the source manager and the owner cancel; destination manager and clerks cannot', async () => {
    const fx = await setupTransfers()
    const { id } = await twoLotsInTransit(fx)
    const before = await transferState()
    for (const actor of [fx.managerB, fx.clerkA]) {
      const error = await errorOf(() =>
        cancelTransfer(actor, { transferId: id }),
      )
      expect(error).toMatchObject({
        code: 'forbidden',
        message: 'No tienes permiso para esta acción.',
      })
    }
    expect(await transferState()).toEqual(before)
    await cancelTransfer(fx.owner, { transferId: id })
  })

  test('unknown transfer', async () => {
    const fx = await setupTransfers()
    const error = await errorOf(() =>
      cancelTransfer(fx.owner, { transferId: crypto.randomUUID() }),
    )
    expect(error).toMatchObject({
      code: 'not_found',
      message: 'No encontramos ese traslado.',
    })
  })

  test('receive and cancel racing: exactly one wins and the ledger stays whole', async () => {
    const fx = await setupTransfers()
    const { early, late, id } = await twoLotsInTransit(fx)
    const lines = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, id))
    const results = await Promise.allSettled([
      cancelTransfer(fx.managerA, { transferId: id }),
      receiveTransfer(fx.managerB, {
        transferId: id,
        lines: lines.map((line) => ({
          lineId: line.id,
          receivedQuantity: line.quantity,
        })),
      }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const [stored] = await db.select().from(transfers)
    const total = (await onHandOf(early.id)) + (await onHandOf(late.id)) // source side
    expect(stored.status === 'Cancelado' ? total : total + 6).toBe(14)
  })
})

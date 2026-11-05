import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { transferLines } from '#/modules/transfers/db/schema'
import { cancelTransfer } from '#/modules/transfers/services/transfer-cancel'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'
import {
  getTransfer,
  listTransferDestinations,
  listWarehouseTransfers,
} from '#/modules/transfers/services/transfer-reads'
import { receiveTransfer } from '#/modules/transfers/services/transfer-receive'
import {
  errorOf,
  receive,
  setupTransfers,
} from '#/modules/transfers/services/testing'

beforeEach(() => resetDatabase(db))

async function setup() {
  const fx = await setupTransfers()
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 20,
    lotCode: 'L-1',
    expiresOn: '2099-01-01',
  })
  const sent = await dispatchTransfer(fx.managerA, {
    fromWarehouseId: fx.a.id,
    toWarehouseId: fx.b.id,
    notes: 'Para el sábado',
    items: [{ productId: fx.milkBox.id, quantity: 8 }],
  })
  return { fx, sent }
}

describe('transfer reads', () => {
  test('both warehouses list the transfer with its lines and direction', async () => {
    const { fx, sent } = await setup()
    const out = await listWarehouseTransfers(fx.managerA, fx.a.id)
    const incoming = await listWarehouseTransfers(fx.managerB, fx.b.id)
    expect(out).toHaveLength(1)
    expect(incoming).toHaveLength(1)
    expect(out[0]).toMatchObject({
      id: sent.id,
      direction: 'out',
      status: 'En tránsito',
      fromWarehouseName: 'Almacén A',
      toWarehouseName: 'Almacén B',
      notes: 'Para el sábado',
      createdByName: 'gerente-a',
      sentTotal: 8,
      receivedTotal: null,
      shortage: 0,
    })
    expect(incoming[0]).toMatchObject({ id: sent.id, direction: 'in' })
    expect(out[0].lines[0]).toMatchObject({
      productName: 'Leche entera 1L',
      sku: 'LEC-9',
      unit: 'piezas',
      lotCode: 'L-1',
      expiresOn: '2099-01-01',
      quantity: 8,
      receivedQuantity: null,
    })
  })

  test('shows received totals and the shortage once received', async () => {
    const { fx, sent } = await setup()
    const [line] = await db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, sent.id))
    await receiveTransfer(fx.managerB, {
      transferId: sent.id,
      lines: [{ lineId: line.id, receivedQuantity: 5 }],
    })
    const [view] = await listWarehouseTransfers(fx.owner, fx.b.id)
    expect(view).toMatchObject({
      status: 'Recibido con diferencia',
      sentTotal: 8,
      receivedTotal: 5,
      shortage: 3,
      closedByName: 'gerente-b',
    })
  })

  test('a cancelled transfer has no shortage', async () => {
    const { fx, sent } = await setup()
    await cancelTransfer(fx.managerA, { transferId: sent.id })
    const view = await getTransfer(fx.managerA, sent.id)
    expect(view).toMatchObject({ status: 'Cancelado', shortage: 0 })
  })

  test('reading needs view access to one of the two warehouses', async () => {
    const { fx, sent } = await setup()
    expect((await getTransfer(fx.clerkA, sent.id)).id).toBe(sent.id)
    expect((await getTransfer(fx.managerB, sent.id)).id).toBe(sent.id)
    const forbidden = {
      code: 'forbidden',
      message: 'No tienes permiso para esta acción.',
    }
    expect(
      await errorOf(() => listWarehouseTransfers(fx.managerB, fx.a.id)),
    ).toMatchObject(forbidden)
    expect(
      await errorOf(() => listWarehouseTransfers(fx.clerkA, fx.b.id)),
    ).toMatchObject(forbidden)
    expect(
      await errorOf(() => getTransfer(fx.managerB, crypto.randomUUID())),
    ).toMatchObject({ code: 'not_found' })
  })

  test('destinations are every other warehouse, for managers of the source only', async () => {
    const { fx } = await setup()
    expect(await listTransferDestinations(fx.managerA, fx.a.id)).toEqual([
      { id: fx.b.id, name: 'Almacén B' },
    ])
    expect(
      await errorOf(() => listTransferDestinations(fx.clerkA, fx.a.id)),
    ).toMatchObject({ code: 'forbidden' })
  })
})

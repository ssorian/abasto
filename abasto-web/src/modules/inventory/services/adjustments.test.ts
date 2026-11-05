import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { AppErrorCode } from '#/lib/errors'
import { stockMovements } from '#/modules/inventory/db/schema'
import {
  adjustLot,
  registerLoss,
} from '#/modules/inventory/services/stock-adjustments'
import {
  errorOf,
  inventoryState,
  ledgerSum,
  onHandOf,
  receive,
  setupInventory,
} from '#/modules/inventory/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

async function setup() {
  const fx = await setupInventory()
  const lot = await receive(fx, { quantity: 10 })
  return { fx, lot }
}

async function rejects(
  run: () => Promise<unknown>,
  code: AppErrorCode,
  message: string,
) {
  const before = await inventoryState()
  const error = await errorOf(run)
  expect(error.code).toBe(code)
  expect(error.message).toBe(message)
  expect(await inventoryState()).toEqual(before)
}

describe('adjustLot', () => {
  test('a positive adjustment adds stock and records the reason', async () => {
    const { fx, lot } = await setup()
    await adjustLot(fx.managerA, {
      lotId: lot.id,
      quantity: 4,
      reason: 'Sobrante',
    })
    expect(await onHandOf(lot.id)).toBe(14)
    const [movement] = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'adjustment'))
    expect(movement).toMatchObject({
      lotId: lot.id,
      quantity: 4,
      reason: 'Sobrante',
      actorId: fx.managerA.userId,
    })
    expect(await ledgerSum(lot.id)).toBe(14)
  })

  test('a negative adjustment removes stock; the owner may adjust too', async () => {
    const { fx, lot } = await setup()
    await adjustLot(fx.owner, {
      lotId: lot.id,
      quantity: -10,
      reason: ' Error de captura ',
    })
    expect(await onHandOf(lot.id)).toBe(0)
    expect(await ledgerSum(lot.id)).toBe(0)
  })

  test('rejects removing more than the lot holds', async () => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        adjustLot(fx.managerA, { lotId: lot.id, quantity: -11, reason: 'x' }),
      'conflict',
      'No hay suficiente existencia en ese lote.',
    )
  })

  test('rejects a blank reason', async () => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        adjustLot(fx.managerA, { lotId: lot.id, quantity: 1, reason: '   ' }),
      'invalid',
      'Escribe el motivo del ajuste.',
    )
  })

  test.each([0, 1.5])('rejects quantity %p', async (quantity) => {
    const { fx, lot } = await setup()
    await rejects(
      () => adjustLot(fx.managerA, { lotId: lot.id, quantity, reason: 'x' }),
      'invalid',
      'La cantidad del ajuste debe ser un entero distinto de cero.',
    )
  })

  test('rejects an unknown lot', async () => {
    const { fx } = await setup()
    await rejects(
      () =>
        adjustLot(fx.owner, {
          lotId: crypto.randomUUID(),
          quantity: 1,
          reason: 'x',
        }),
      'not_found',
      'No encontramos ese lote.',
    )
  })

  test('a clerk, and the manager of another warehouse, cannot adjust', async () => {
    const { fx, lot } = await setup()
    for (const actor of [fx.clerkA, fx.managerB]) {
      await rejects(
        () => adjustLot(actor, { lotId: lot.id, quantity: 1, reason: 'x' }),
        'forbidden',
        forbidden,
      )
    }
  })
})

describe('registerLoss', () => {
  test('removes stock and records category and reason', async () => {
    const { fx, lot } = await setup()
    await registerLoss(fx.managerA, {
      lotId: lot.id,
      quantity: 3,
      category: 'dañado',
      reason: 'Se cayó la tarima',
    })
    expect(await onHand(lot.id)).toBe(7)
    const [movement] = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, 'loss'))
    expect(movement).toMatchObject({
      quantity: -3,
      reason: 'dañado: Se cayó la tarima',
    })
    expect(await ledgerSum(lot.id)).toBe(7)
  })

  test('rejects a blank reason', async () => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        registerLoss(fx.managerA, {
          lotId: lot.id,
          quantity: 1,
          category: 'otro',
          reason: '',
        }),
      'invalid',
      'Escribe el motivo de la pérdida.',
    )
  })

  test('rejects an unknown category', async () => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        registerLoss(fx.managerA, {
          lotId: lot.id,
          quantity: 1,
          category: 'robo' as 'otro',
          reason: 'x',
        }),
      'invalid',
      'Selecciona el tipo de pérdida.',
    )
  })

  test.each([0, -2, 1.5])('rejects quantity %p', async (quantity) => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        registerLoss(fx.managerA, {
          lotId: lot.id,
          quantity,
          category: 'otro',
          reason: 'x',
        }),
      'invalid',
      'La cantidad debe ser mayor que cero.',
    )
  })

  test('rejects a loss larger than the stock', async () => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        registerLoss(fx.managerA, {
          lotId: lot.id,
          quantity: 11,
          category: 'caducado',
          reason: 'x',
        }),
      'conflict',
      'No hay suficiente existencia en ese lote.',
    )
  })

  test('a clerk cannot register losses', async () => {
    const { fx, lot } = await setup()
    await rejects(
      () =>
        registerLoss(fx.clerkA, {
          lotId: lot.id,
          quantity: 1,
          category: 'otro',
          reason: 'x',
        }),
      'forbidden',
      forbidden,
    )
  })
})

const onHand = onHandOf

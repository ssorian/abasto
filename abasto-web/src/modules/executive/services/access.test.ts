import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import type { Actor } from '#/modules/access/lib/policy'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
import { errorOf, setupReports } from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'
const period = {
  period: { preset: 'custom' as const, from: '2026-11-01', to: '2026-11-30' },
}
const customer: Actor = {
  userId: 'customer-user',
  role: 'customer',
  assignments: new Map(),
}

const entryPoints = {
  getMarginReport: (actor: Actor) => getMarginReport(actor, period),
  getWarehouseRanking: (actor: Actor) => getWarehouseRanking(actor, period),
  getInventoryValue: (actor: Actor) => getInventoryValue(actor),
  getNonMovingCapital: (actor: Actor) => getNonMovingCapital(actor),
}

describe('executive console is owner only', () => {
  test('managers of either warehouse and a customer are refused by every entry point', async () => {
    const fx = await setupReports()
    for (const actor of [fx.managerB, fx.staffA, customer]) {
      for (const [name, run] of Object.entries(entryPoints)) {
        const error = await errorOf(() => run(actor))
        expect({ name, role: actor.role, code: error.code }).toEqual({
          name,
          role: actor.role,
          code: 'forbidden',
        })
        expect(error.message).toBe(forbidden)
      }
    }
  })

  test('a non-owner asking for an invalid window is refused, not validated', async () => {
    const fx = await setupReports()
    const error = await errorOf(() =>
      getNonMovingCapital(fx.managerB, { days: 45 }),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
  })

  test('the owner still gets the window validation', async () => {
    const fx = await setupReports()
    const error = await errorOf(() =>
      getNonMovingCapital(fx.owner, { days: 45 }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe('Los días sin venta deben ser 30, 60 o 90.')
  })
})

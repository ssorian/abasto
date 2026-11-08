import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { closeCashSession } from '#/modules/cash/services/cash-sessions'
import { getRidersOverview } from '#/modules/riders/server/riders-overview'
import {
  assignRider,
  cancelAssignment,
} from '#/modules/riders/services/assignments'
import { receive, setupRiders } from '#/modules/riders/services/testing'

beforeEach(() => resetDatabase(db))

describe('getRidersOverview', () => {
  test('gives a manager their warehouse, riders, open drawer, assignments and products', async () => {
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
    const detail = await assignRider(fx.staffA, {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, boxes: 2, units: 1 }],
    })
    const view = await getRidersOverview(fx.managerA)
    expect(view.warehouses).toEqual([{ id: fx.a.id, name: 'Almacén A' }])
    expect(view.selectedId).toBe(fx.a.id)
    expect(view.canManage).toBe(true)
    expect(view.riders.map((r) => r.name)).toEqual(['Luis', 'Marta'])
    expect(view.cash?.session.warehouseId).toBe(fx.a.id)
    expect(view.assignments.map((a) => [a.id, a.status])).toEqual([
      [detail.id, 'En ruta'],
    ])
    expect(view.assignments[0].lines[0].assignedQuantity).toBe(25)
    expect(view.products).toEqual([
      expect.objectContaining({
        productId: fx.milkBox.id,
        boxFactor: 12,
        available: 75,
      }),
    ])
  })

  test('reports no drawer when the warehouse has none open', async () => {
    const fx = await setupRiders()
    await closeCashSession(fx.staffA, {
      warehouseId: fx.a.id,
      countedCents: 0,
    })
    expect((await getRidersOverview(fx.owner, fx.a.id)).cash).toBeNull()
  })

  test('the owner picks a warehouse; an unknown one falls back to the first', async () => {
    const fx = await setupRiders()
    const both = await getRidersOverview(fx.owner)
    expect(both.warehouses.map((w) => w.id).sort()).toEqual(
      [fx.a.id, fx.b.id].sort(),
    )
    expect((await getRidersOverview(fx.owner, fx.b.id)).selectedId).toBe(
      fx.b.id,
    )
    expect(
      (await getRidersOverview(fx.owner, 'not-a-warehouse')).selectedId,
    ).toBe(both.warehouses[0].id)
  })

  test("never shows another warehouse's data to a manager; customers get nothing", async () => {
    const fx = await setupRiders()
    const view = await getRidersOverview(fx.managerB, fx.a.id)
    expect(view.selectedId).toBe(fx.b.id)
    expect(view.riders).toEqual([])
    expect(view.canManage).toBe(true)
    const none = await getRidersOverview(fx.customerActor)
    expect(none).toMatchObject({
      warehouses: [],
      selectedId: null,
      riders: [],
      assignments: [],
    })
  })

  test('a cancelled assignment of today still shows with its status', async () => {
    const fx = await setupRiders()
    await receive(fx, { productId: fx.milkBox.id, quantity: 30 })
    const detail = await assignRider(fx.staffA, {
      riderId: fx.rider.id,
      lines: [{ productId: fx.milkBox.id, units: 5 }],
    })
    await cancelAssignment(fx.staffA, { assignmentId: detail.id })
    const view = await getRidersOverview(fx.staffA)
    expect(view.assignments.map((a) => a.status)).toEqual(['Cancelada'])
    expect(view.products[0].available).toBe(30)
  })
})

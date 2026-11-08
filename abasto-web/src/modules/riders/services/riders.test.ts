import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import {
  createRider,
  listRiders,
  renameRider,
  setRiderActive,
} from '#/modules/riders/services/riders'
import { errorOf, setupRiders } from '#/modules/riders/services/testing'

beforeEach(() => resetDatabase(db))

describe('riders catalog', () => {
  test('creates, renames, deactivates and lists riders of a warehouse', async () => {
    const fx = await setupRiders()
    const created = await createRider(fx.owner, {
      warehouseId: fx.a.id,
      name: '  Pedro  ',
    })
    expect(created).toMatchObject({ name: 'Pedro', active: true })
    await renameRider(fx.managerA, { riderId: created.id, name: 'Pedro R.' })
    await setRiderActive(fx.managerA, { riderId: created.id, active: false })
    await createRider(fx.managerB, { warehouseId: fx.b.id, name: 'Otro' })
    const listed = await listRiders(fx.managerA, { warehouseId: fx.a.id })
    expect(listed.map((r) => [r.name, r.active])).toEqual([
      ['Luis', true],
      ['Marta', true],
      ['Pedro R.', false],
    ])
    await setRiderActive(fx.owner, { riderId: created.id, active: true })
    expect(
      (await listRiders(fx.owner, { warehouseId: fx.a.id })).at(-1)?.active,
    ).toBe(true)
  })

  test('refuses blank and duplicate names in the same warehouse', async () => {
    const fx = await setupRiders()
    expect(
      (
        await errorOf(() =>
          createRider(fx.owner, { warehouseId: fx.a.id, name: '   ' }),
        )
      ).code,
    ).toBe('invalid')
    expect(
      (
        await errorOf(() =>
          createRider(fx.owner, { warehouseId: fx.a.id, name: 'luis' }),
        )
      ).code,
    ).toBe('conflict')
    expect(
      (
        await errorOf(() =>
          renameRider(fx.owner, { riderId: fx.other.id, name: 'LUIS' }),
        )
      ).code,
    ).toBe('conflict')
    // The same name is fine in another warehouse.
    await createRider(fx.owner, { warehouseId: fx.b.id, name: 'Luis' })
  })

  test('access: managers only in their warehouse, customers nothing', async () => {
    const fx = await setupRiders()
    const denied = (run: () => Promise<unknown>) =>
      errorOf(run).then((error) => error.code)
    expect(
      await denied(() =>
        createRider(fx.managerB, { warehouseId: fx.a.id, name: 'X' }),
      ),
    ).toBe('forbidden')
    expect(
      await denied(() =>
        renameRider(fx.managerB, { riderId: fx.rider.id, name: 'X' }),
      ),
    ).toBe('forbidden')
    expect(
      await denied(() =>
        setRiderActive(fx.managerB, { riderId: fx.rider.id, active: false }),
      ),
    ).toBe('forbidden')
    expect(
      await denied(() => listRiders(fx.managerB, { warehouseId: fx.a.id })),
    ).toBe('forbidden')
    expect(
      await denied(() =>
        createRider(fx.customerActor, { warehouseId: fx.a.id, name: 'X' }),
      ),
    ).toBe('forbidden')
    expect(
      await denied(() =>
        listRiders(fx.customerActor, { warehouseId: fx.a.id }),
      ),
    ).toBe('forbidden')
  })

  test('a malformed or unknown id is not found, never another scope', async () => {
    const fx = await setupRiders()
    for (const riderId of ['nope', '00000000-0000-4000-8000-000000000000']) {
      expect(
        (await errorOf(() => renameRider(fx.owner, { riderId, name: 'X' })))
          .code,
      ).toBe('not_found')
    }
    expect(
      (await errorOf(() => listRiders(fx.owner, { warehouseId: 'nope' }))).code,
    ).toBe('not_found')
  })
})

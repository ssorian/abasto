import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import { signIn } from '#/modules/access/lib/testing'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
  listUsers,
  requireActor,
  unassignWarehouse,
} from '#/modules/access/services/access'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'

const notFound = 'No encontramos ese usuario o almacén.'
const missingId = '00000000-0000-4000-8000-000000000000'

async function expectAppError(
  run: () => Promise<unknown>,
  code: AppError['code'],
  message: string,
) {
  let error: unknown
  try {
    await run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(AppError)
  expect((error as AppError).code).toBe(code)
  expect((error as AppError).message).toBe(message)
}

async function setup() {
  const ownerUser = await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  const owner = await requireActor(
    await signIn('dueno@abasto.test', 'secreto-123'),
  )
  const staffUser = await createStaffUser(owner, {
    name: 'Beto',
    email: 'beto@abasto.test',
    password: 'secreto-456',
  })
  const north = await createWarehouse(owner, { name: 'Norte' })
  const center = await createWarehouse(owner, { name: 'Centro' })
  return { owner, ownerUser, staffUser, north, center }
}

beforeEach(() => resetDatabase(db))

describe('listUsers', () => {
  test('lists the owner first, then staff by name, with sorted assignments', async () => {
    const { owner, staffUser, north, center } = await setup()
    await createStaffUser(owner, {
      name: 'Ana',
      email: 'ana@abasto.test',
      password: 'secreto-789',
    })
    await assignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: north.id,
      role: 'manager',
    })
    await assignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: center.id,
      role: 'clerk',
    })
    const users = await listUsers(owner)
    expect(users.map((u) => [u.name, u.role])).toEqual([
      ['Dueño', 'owner'],
      ['Ana', 'staff'],
      ['Beto', 'staff'],
    ])
    expect(users[0]).toEqual({
      id: users[0].id,
      name: 'Dueño',
      email: 'dueno@abasto.test',
      role: 'owner',
      assignments: [],
    })
    expect(users[1].assignments).toEqual([])
    expect(users[2].assignments).toEqual([
      { warehouseId: center.id, warehouseName: 'Centro', role: 'clerk' },
      { warehouseId: north.id, warehouseName: 'Norte', role: 'manager' },
    ])
  })

  test('staff cannot list users', async () => {
    await setup()
    const staff = await requireActor(
      await signIn('beto@abasto.test', 'secreto-456'),
    )
    await expectAppError(
      () => listUsers(staff),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
  })
})

describe('unassignWarehouse', () => {
  test('removes only that assignment and the staff session loses it', async () => {
    const { owner, staffUser, north, center } = await setup()
    for (const warehouse of [north, center]) {
      await assignWarehouse(owner, {
        userId: staffUser.id,
        warehouseId: warehouse.id,
        role: 'clerk',
      })
    }
    await unassignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: north.id,
    })
    const staff = await requireActor(
      await signIn('beto@abasto.test', 'secreto-456'),
    )
    expect([...staff.assignments]).toEqual([[center.id, 'clerk']])
  })

  test('staff cannot unassign and state is unchanged', async () => {
    const { owner, staffUser, north } = await setup()
    await assignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: north.id,
      role: 'manager',
    })
    const staff = await requireActor(
      await signIn('beto@abasto.test', 'secreto-456'),
    )
    await expectAppError(
      () =>
        unassignWarehouse(staff, {
          userId: staffUser.id,
          warehouseId: north.id,
        }),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    const users = await listUsers(owner)
    expect(users.find((u) => u.id === staffUser.id)?.assignments).toHaveLength(
      1,
    )
  })

  test('rejects unknown users and warehouses', async () => {
    const { owner, staffUser, north } = await setup()
    await expectAppError(
      () =>
        unassignWarehouse(owner, { userId: 'nadie', warehouseId: north.id }),
      'not_found',
      notFound,
    )
    await expectAppError(
      () =>
        unassignWarehouse(owner, {
          userId: staffUser.id,
          warehouseId: missingId,
        }),
      'not_found',
      notFound,
    )
  })
})

describe('owner row', () => {
  const ownerMessage = 'El dueño ya tiene acceso a todos los almacenes.'

  test('cannot be assigned or unassigned and nothing is stored', async () => {
    const { owner, ownerUser, north } = await setup()
    await expectAppError(
      () =>
        assignWarehouse(owner, {
          userId: ownerUser.id,
          warehouseId: north.id,
          role: 'manager',
        }),
      'invalid',
      ownerMessage,
    )
    await expectAppError(
      () =>
        unassignWarehouse(owner, {
          userId: ownerUser.id,
          warehouseId: north.id,
        }),
      'invalid',
      ownerMessage,
    )
    expect((await listUsers(owner))[0].assignments).toEqual([])
  })

  test('assigning to an unknown user is not_found', async () => {
    const { owner, north } = await setup()
    await expectAppError(
      () =>
        assignWarehouse(owner, {
          userId: 'nadie',
          warehouseId: north.id,
          role: 'clerk',
        }),
      'not_found',
      notFound,
    )
  })
})

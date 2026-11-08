import { beforeEach, describe, expect, test } from 'bun:test'
import { count } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
  requireActor,
} from '#/modules/access/services/access'
import { signIn } from '#/modules/access/lib/testing'
import { warehouses } from '#/modules/warehouses/db/schema'
import {
  createWarehouse,
  listWarehouses,
} from '#/modules/warehouses/services/warehouses'

async function setup() {
  await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  const owner = await requireActor(
    await signIn('dueno@abasto.test', 'secreto-123'),
  )
  const staffUser = await createStaffUser(owner, {
    name: 'Cajero',
    email: 'cajero@abasto.test',
    password: 'secreto-456',
  })
  return { owner, staffUser }
}

const warehouseCount = async () =>
  (await db.select({ value: count() }).from(warehouses))[0]?.value

async function errorOf(run: () => Promise<unknown>) {
  try {
    await run()
  } catch (error) {
    return error as AppError
  }
  throw new Error('expected an error')
}

beforeEach(() => resetDatabase(db))

describe('createWarehouse', () => {
  test('the owner creates a warehouse with a trimmed name', async () => {
    const { owner } = await setup()
    const created = await createWarehouse(owner, { name: '  Centro ' })
    expect(created.name).toBe('Centro')
    expect(await listWarehouses(owner)).toEqual([created])
  })

  test('rejects a duplicate name regardless of case and spaces', async () => {
    const { owner } = await setup()
    await createWarehouse(owner, { name: 'Centro' })
    const error = await errorOf(() =>
      createWarehouse(owner, { name: ' centro' }),
    )
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('Ya existe un almacén con ese nombre.')
    expect(await warehouseCount()).toBe(1)
  })

  test('rejects an empty name', async () => {
    const { owner } = await setup()
    const error = await errorOf(() => createWarehouse(owner, { name: '   ' }))
    expect(error.code).toBe('invalid')
    expect(error.message).toBe('Escribe el nombre del almacén.')
    expect(await warehouseCount()).toBe(0)
  })

  test('rejects a name longer than 80 characters', async () => {
    const { owner } = await setup()
    const error = await errorOf(() =>
      createWarehouse(owner, { name: 'A'.repeat(81) }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(
      'El nombre del almacén no puede tener más de 80 caracteres.',
    )
    expect(await warehouseCount()).toBe(0)
    expect((await createWarehouse(owner, { name: 'B'.repeat(80) })).name).toBe(
      'B'.repeat(80),
    )
  })

  test('staff cannot create warehouses', async () => {
    await setup()
    const staff = await requireActor(
      await signIn('cajero@abasto.test', 'secreto-456'),
    )
    const error = await errorOf(() => createWarehouse(staff, { name: 'Sur' }))
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe('No tienes permiso para esta acción.')
    expect(await warehouseCount()).toBe(0)
  })
})

describe('listWarehouses', () => {
  test('the owner sees every warehouse sorted by name; staff only their own', async () => {
    const { owner, staffUser } = await setup()
    const sur = await createWarehouse(owner, { name: 'Sur' })
    const centro = await createWarehouse(owner, { name: 'Centro' })
    const norte = await createWarehouse(owner, { name: 'Norte' })
    await assignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: norte.id,
      role: 'manager',
    })
    const staff = await requireActor(
      await signIn('cajero@abasto.test', 'secreto-456'),
    )
    expect((await listWarehouses(owner)).map(({ name }) => name)).toEqual([
      'Centro',
      'Norte',
      'Sur',
    ])
    expect(await listWarehouses(staff)).toEqual([norte])
    expect([centro.id, sur.id]).not.toContain(norte.id)
  })
})

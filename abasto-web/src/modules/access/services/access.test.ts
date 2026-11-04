import { beforeEach, describe, expect, test } from 'bun:test'
import { count } from 'drizzle-orm'
import { db } from '#/db'
import { user } from '#/db/auth-schema'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
  requireActor,
} from '#/modules/access/services/access'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'
import { signIn, signUp, updateOwnUser } from '#/modules/access/lib/testing'

const ownerInput = {
  name: 'Dueño',
  email: 'dueno@abasto.test',
  password: 'secreto-123',
}

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

const userCount = async () =>
  (await db.select({ value: count() }).from(user))[0]?.value

async function ownerActor() {
  await bootstrapOwner(ownerInput)
  return requireActor(await signIn(ownerInput.email, ownerInput.password))
}

beforeEach(() => resetDatabase(db))

describe('bootstrapOwner', () => {
  test('creates an owner who can sign in', async () => {
    await bootstrapOwner(ownerInput)
    const actor = await requireActor(
      await signIn(ownerInput.email, ownerInput.password),
    )
    expect(actor.role).toBe('owner')
    expect(actor.assignments.size).toBe(0)
  })

  test('refuses a second owner and stores nothing', async () => {
    await bootstrapOwner(ownerInput)
    await expectAppError(
      () => bootstrapOwner({ ...ownerInput, email: 'otro@abasto.test' }),
      'conflict',
      'Ya existe un dueño registrado.',
    )
    expect(await userCount()).toBe(1)
  })
})

test('public sign-up is disabled', async () => {
  const response = await signUp('intruso@abasto.test', 'secreto-123')
  expect(response.status).toBe(400)
  expect(await userCount()).toBe(0)
})

test('a user cannot change their own role', async () => {
  const owner = await ownerActor()
  await createStaffUser(owner, {
    name: 'Cajero',
    email: 'cajero@abasto.test',
    password: 'secreto-456',
  })
  const headers = await signIn('cajero@abasto.test', 'secreto-456')
  const response = await updateOwnUser(headers, { role: 'owner' })
  expect(response.status).toBe(400)
  expect((await requireActor(headers)).role).toBe('staff')
})

describe('requireActor', () => {
  test('rejects a request without a session', async () => {
    await expectAppError(
      () => requireActor(new Headers()),
      'unauthorized',
      'Inicia sesión para continuar.',
    )
  })
})

describe('createStaffUser', () => {
  test('the owner creates staff that can sign in without owner rights', async () => {
    const owner = await ownerActor()
    await createStaffUser(owner, {
      name: 'Cajero',
      email: 'Cajero@Abasto.test ',
      password: 'secreto-456',
    })
    const staff = await requireActor(
      await signIn('cajero@abasto.test', 'secreto-456'),
    )
    expect(staff.role).toBe('staff')
  })

  test('staff cannot create users and nothing is stored', async () => {
    const owner = await ownerActor()
    await createStaffUser(owner, {
      name: 'Cajero',
      email: 'cajero@abasto.test',
      password: 'secreto-456',
    })
    const staff = await requireActor(
      await signIn('cajero@abasto.test', 'secreto-456'),
    )
    await expectAppError(
      () =>
        createStaffUser(staff, {
          name: 'Otro',
          email: 'otro@abasto.test',
          password: 'secreto-789',
        }),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    expect(await userCount()).toBe(2)
  })

  test('rejects a duplicate email', async () => {
    const owner = await ownerActor()
    await expectAppError(
      () =>
        createStaffUser(owner, {
          name: 'Copia',
          email: 'DUENO@abasto.test',
          password: 'secreto-456',
        }),
      'conflict',
      'Ya existe un usuario con ese correo.',
    )
    expect(await userCount()).toBe(1)
  })

  test('rejects a password shorter than 8 characters', async () => {
    const owner = await ownerActor()
    await expectAppError(
      () =>
        createStaffUser(owner, {
          name: 'Corta',
          email: 'corta@abasto.test',
          password: '1234567',
        }),
      'invalid',
      'La contraseña debe tener al menos 8 caracteres.',
    )
    expect(await userCount()).toBe(1)
  })
})

describe('assignWarehouse', () => {
  test('the owner assigns a role that the staff session then carries', async () => {
    const owner = await ownerActor()
    const staffUser = await createStaffUser(owner, {
      name: 'Encargado',
      email: 'encargado@abasto.test',
      password: 'secreto-456',
    })
    const north = await createWarehouse(owner, { name: 'Norte' })
    await assignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: north.id,
      role: 'manager',
    })
    await assignWarehouse(owner, {
      userId: staffUser.id,
      warehouseId: north.id,
      role: 'clerk',
    })
    const staff = await requireActor(
      await signIn('encargado@abasto.test', 'secreto-456'),
    )
    expect([...staff.assignments]).toEqual([[north.id, 'clerk']])
  })

  test('staff cannot assign warehouses', async () => {
    const owner = await ownerActor()
    const staffUser = await createStaffUser(owner, {
      name: 'Encargado',
      email: 'encargado@abasto.test',
      password: 'secreto-456',
    })
    const north = await createWarehouse(owner, { name: 'Norte' })
    const staff = await requireActor(
      await signIn('encargado@abasto.test', 'secreto-456'),
    )
    await expectAppError(
      () =>
        assignWarehouse(staff, {
          userId: staffUser.id,
          warehouseId: north.id,
          role: 'manager',
        }),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    expect(
      (await requireActor(await signIn('encargado@abasto.test', 'secreto-456')))
        .assignments.size,
    ).toBe(0)
  })

  test('rejects an unknown warehouse', async () => {
    const owner = await ownerActor()
    const staffUser = await createStaffUser(owner, {
      name: 'Encargado',
      email: 'encargado@abasto.test',
      password: 'secreto-456',
    })
    await expectAppError(
      () =>
        assignWarehouse(owner, {
          userId: staffUser.id,
          warehouseId: '00000000-0000-4000-8000-000000000000',
          role: 'manager',
        }),
      'not_found',
      'No encontramos ese usuario o almacén.',
    )
  })
})

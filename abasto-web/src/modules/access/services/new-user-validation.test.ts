import { beforeEach, describe, expect, test } from 'bun:test'
import { asc } from 'drizzle-orm'
import { db } from '#/db'
import { account, user } from '#/db/auth-schema'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import { signIn } from '#/modules/access/lib/testing'
import {
  bootstrapOwner,
  createStaffUser,
  requireActor,
} from '#/modules/access/services/access'

async function ownerActor() {
  await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  return requireActor(await signIn('dueno@abasto.test', 'secreto-123'))
}

const stored = async () => ({
  users: await db.select().from(user).orderBy(asc(user.id)),
  accounts: await db.select().from(account).orderBy(asc(account.id)),
})

async function rejection(run: () => Promise<unknown>) {
  try {
    await run()
  } catch (error) {
    return error as AppError
  }
  throw new Error('expected the call to be rejected')
}

beforeEach(() => resetDatabase(db))

describe('createStaffUser validation', () => {
  test('an empty form reports name, email and password together', async () => {
    const owner = await ownerActor()
    const before = await stored()
    const error = await rejection(() =>
      createStaffUser(owner, { name: '', email: '', password: '' }),
    )
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(
      'Escribe el nombre. Escribe un correo válido. Escribe la contraseña inicial (mínimo 8 caracteres).',
    )
    expect(await stored()).toEqual(before)
  })

  test('only the missing fields are reported', async () => {
    const owner = await ownerActor()
    const before = await stored()
    const noName = await rejection(() =>
      createStaffUser(owner, {
        name: '   ',
        email: 'ana@abasto.test',
        password: 'secreto-456',
      }),
    )
    expect(noName.message).toBe('Escribe el nombre.')
    const noEmailShortPassword = await rejection(() =>
      createStaffUser(owner, {
        name: 'Ana',
        email: 'sin-arroba',
        password: '123',
      }),
    )
    expect(noEmailShortPassword.message).toBe(
      'Escribe un correo válido. La contraseña debe tener al menos 8 caracteres.',
    )
    expect(await stored()).toEqual(before)
  })
})

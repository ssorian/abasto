import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { session, user } from '#/db/auth-schema'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import { signIn } from '#/modules/access/lib/testing'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
  listUsers,
  requireActor,
} from '#/modules/access/services/access'
import { customers } from '#/modules/customers/db/schema'
import {
  createCustomer,
  updateCustomer,
} from '#/modules/customers/services/customers'
import {
  getStoreAccess,
  grantStoreAccess,
  requireCustomer,
  setStoreAccessPassword,
} from '#/modules/store/services/store-access'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'

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

const access = { email: 'Tienda@Cliente.test ', password: 'cliente-123' }

async function setup() {
  await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  const owner = await requireActor(
    await signIn('dueno@abasto.test', 'secreto-123'),
  )
  await createStaffUser(owner, {
    name: 'Beto',
    email: 'beto@abasto.test',
    password: 'secreto-456',
  })
  const staff = await requireActor(
    await signIn('beto@abasto.test', 'secreto-456'),
  )
  const customer = await createCustomer(owner, { name: 'Abarrotes Luna' })
  return { owner, staff, customer }
}

const linkedUserId = async (customerId: string) =>
  (
    await db
      .select({ userId: customers.userId })
      .from(customers)
      .where(eq(customers.id, customerId))
  )[0]?.userId ?? null

beforeEach(() => resetDatabase(db))

describe('grantStoreAccess', () => {
  test('the owner creates a customer account linked to the customer', async () => {
    const { owner, customer } = await setup()
    const granted = await grantStoreAccess(owner, {
      customerId: customer.id,
      ...access,
    })
    expect(granted).toEqual({ email: 'tienda@cliente.test' })
    const userId = await linkedUserId(customer.id)
    expect(userId).not.toBeNull()
    const [row] = await db
      .select({ role: user.role, name: user.name })
      .from(user)
      .where(eq(user.id, userId!))
    expect(row).toEqual({ role: 'customer', name: 'Abarrotes Luna' })
    expect(await getStoreAccess(owner, customer.id)).toEqual({
      email: 'tienda@cliente.test',
    })
    const headers = await signIn('tienda@cliente.test', 'cliente-123')
    expect(await requireCustomer(headers)).toEqual({
      userId: userId!,
      customerId: customer.id,
      customerName: 'Abarrotes Luna',
    })
  })

  test('only the owner grants access', async () => {
    const { staff, customer } = await setup()
    await expectAppError(
      () => grantStoreAccess(staff, { customerId: customer.id, ...access }),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    expect(await linkedUserId(customer.id)).toBeNull()
  })

  test('a customer gets one account; duplicate emails are rejected', async () => {
    const { owner, customer } = await setup()
    await grantStoreAccess(owner, { customerId: customer.id, ...access })
    await expectAppError(
      () =>
        grantStoreAccess(owner, {
          customerId: customer.id,
          email: 'otra@cliente.test',
          password: 'cliente-123',
        }),
      'conflict',
      'Este cliente ya tiene acceso a la tienda.',
    )
    const other = await createCustomer(owner, { name: 'Tienda Sol' })
    await expectAppError(
      () => grantStoreAccess(owner, { customerId: other.id, ...access }),
      'conflict',
      'Ya existe un usuario con ese correo.',
    )
    expect(await linkedUserId(other.id)).toBeNull()
  })

  test('validates the customer, email and password', async () => {
    const { owner, customer } = await setup()
    await expectAppError(
      () =>
        grantStoreAccess(owner, {
          customerId: '00000000-0000-4000-8000-000000000000',
          ...access,
        }),
      'not_found',
      'No encontramos ese cliente.',
    )
    await expectAppError(
      () =>
        grantStoreAccess(owner, {
          customerId: customer.id,
          email: 'sin-arroba',
          password: 'cliente-123',
        }),
      'invalid',
      'Escribe el nombre y un correo válido.',
    )
    await expectAppError(
      () =>
        grantStoreAccess(owner, {
          customerId: customer.id,
          email: 'a@b.test',
          password: 'corta',
        }),
      'invalid',
      'La contraseña debe tener al menos 8 caracteres.',
    )
    expect(await linkedUserId(customer.id)).toBeNull()
  })
})

describe('setStoreAccessPassword', () => {
  test('replaces the password and closes open sessions', async () => {
    const { owner, staff, customer } = await setup()
    await grantStoreAccess(owner, { customerId: customer.id, ...access })
    const old = await signIn('tienda@cliente.test', 'cliente-123')
    await expectAppError(
      () =>
        setStoreAccessPassword(staff, {
          customerId: customer.id,
          password: 'nueva-clave-1',
        }),
      'forbidden',
      'No tienes permiso para esta acción.',
    )
    await setStoreAccessPassword(owner, {
      customerId: customer.id,
      password: 'nueva-clave-1',
    })
    const userId = (await linkedUserId(customer.id))!
    expect(
      await db.select().from(session).where(eq(session.userId, userId)),
    ).toEqual([])
    await expectAppError(
      () => requireCustomer(old),
      'unauthorized',
      'Inicia sesión con tu cuenta de cliente.',
    )
    await expect(signIn('tienda@cliente.test', 'cliente-123')).rejects.toThrow()
    const fresh = await signIn('tienda@cliente.test', 'nueva-clave-1')
    expect((await requireCustomer(fresh)).customerId).toBe(customer.id)
  })

  test('requires an existing access and a long enough password', async () => {
    const { owner, customer } = await setup()
    await expectAppError(
      () =>
        setStoreAccessPassword(owner, {
          customerId: customer.id,
          password: 'nueva-clave-1',
        }),
      'not_found',
      'Este cliente aún no tiene acceso a la tienda.',
    )
    expect(await getStoreAccess(owner, customer.id)).toBeNull()
    await grantStoreAccess(owner, { customerId: customer.id, ...access })
    await expectAppError(
      () =>
        setStoreAccessPassword(owner, {
          customerId: customer.id,
          password: 'corta',
        }),
      'invalid',
      'La contraseña debe tener al menos 8 caracteres.',
    )
  })
})

describe('requireCustomer', () => {
  test('rejects anonymous, staff and owner sessions', async () => {
    await setup()
    const message = 'Inicia sesión con tu cuenta de cliente.'
    await expectAppError(
      () => requireCustomer(new Headers()),
      'unauthorized',
      message,
    )
    await expectAppError(
      async () =>
        requireCustomer(await signIn('beto@abasto.test', 'secreto-456')),
      'unauthorized',
      message,
    )
    await expectAppError(
      async () =>
        requireCustomer(await signIn('dueno@abasto.test', 'secreto-123')),
      'unauthorized',
      message,
    )
  })

  test('an inactive customer cannot use the store', async () => {
    const { owner, customer } = await setup()
    await grantStoreAccess(owner, { customerId: customer.id, ...access })
    const headers = await signIn('tienda@cliente.test', 'cliente-123')
    await updateCustomer(owner, customer.id, { active: false })
    await expectAppError(
      () => requireCustomer(headers),
      'forbidden',
      'Tu cuenta no está activa. Comunícate con el almacén.',
    )
  })
})

describe('customer accounts never reach staff access', () => {
  test('requireActor refuses a customer session', async () => {
    const { owner, customer } = await setup()
    await grantStoreAccess(owner, { customerId: customer.id, ...access })
    await expectAppError(
      async () =>
        requireActor(await signIn('tienda@cliente.test', 'cliente-123')),
      'forbidden',
      'Esta cuenta solo tiene acceso a la tienda.',
    )
  })

  test('customers are not listed or assignable as staff', async () => {
    const { owner, customer } = await setup()
    await grantStoreAccess(owner, { customerId: customer.id, ...access })
    const warehouse = await createWarehouse(owner, { name: 'Norte' })
    expect((await listUsers(owner)).map((u) => u.name)).toEqual([
      'Dueño',
      'Beto',
    ])
    await expectAppError(
      async () =>
        assignWarehouse(owner, {
          userId: (await linkedUserId(customer.id))!,
          warehouseId: warehouse.id,
          role: 'manager',
        }),
      'not_found',
      'No encontramos ese usuario o almacén.',
    )
  })
})

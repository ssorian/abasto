import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '#/modules/customers/services/customers'
import {
  customerCounts,
  errorOf,
  setupActors,
} from '#/modules/customers/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'
const notFound = 'No encontramos ese cliente.'

describe('createCustomer', () => {
  test('the owner creates a customer with trimmed fields; staff can read it', async () => {
    const { owner, staff } = await setupActors()
    const created = await createCustomer(owner, {
      name: '  Distribuidora Norte ',
      phone: ' 555 ',
      addresses: [' Calle 1 ', '', 'Calle 2'],
    })
    expect(created).toMatchObject({
      name: 'Distribuidora Norte',
      phone: '555',
      addresses: ['Calle 1', 'Calle 2'],
      active: true,
    })
    expect(created).not.toHaveProperty('creditLimitCents')
    expect(await getCustomer(staff, created.id)).toEqual(created)
    expect(await listCustomers(staff)).toEqual([created])
  })

  test('rejects an empty name and a duplicate name regardless of case', async () => {
    const { owner } = await setupActors()
    const blank = await errorOf(() => createCustomer(owner, { name: '  ' }))
    expect(blank).toBeInstanceOf(AppError)
    expect(blank.code).toBe('invalid')
    expect(blank.message).toBe('Escribe el nombre del cliente.')
    await createCustomer(owner, { name: 'Distribuidora Norte' })
    const duplicate = await errorOf(() =>
      createCustomer(owner, { name: ' DISTRIBUIDORA norte' }),
    )
    expect(duplicate.code).toBe('conflict')
    expect(duplicate.message).toBe('Ya existe un cliente con ese nombre.')
    expect((await customerCounts()).customers).toBe(1)
  })

  test('staff cannot create', async () => {
    const { staff } = await setupActors()
    const error = await errorOf(() => createCustomer(staff, { name: 'X' }))
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect((await customerCounts()).customers).toBe(0)
  })
})

describe('updateCustomer', () => {
  test('updates the given fields only and can deactivate', async () => {
    const { owner } = await setupActors()
    const created = await createCustomer(owner, { name: 'Norte', phone: '1' })
    const updated = await updateCustomer(owner, created.id, {
      name: 'Norte 2',
      active: false,
    })
    expect(updated).toMatchObject({
      name: 'Norte 2',
      phone: '1',
      active: false,
    })
    expect(await getCustomer(owner, created.id)).toEqual(updated)
  })

  test('rejects blank and duplicate names and leaves the customer unchanged', async () => {
    const { owner } = await setupActors()
    await createCustomer(owner, { name: 'Norte' })
    const sur = await createCustomer(owner, { name: 'Sur' })
    const blank = await errorOf(() =>
      updateCustomer(owner, sur.id, { name: ' ' }),
    )
    expect(blank.message).toBe('Escribe el nombre del cliente.')
    const duplicate = await errorOf(() =>
      updateCustomer(owner, sur.id, { name: 'norte' }),
    )
    expect(duplicate.code).toBe('conflict')
    expect(duplicate.message).toBe('Ya existe un cliente con ese nombre.')
    expect(await getCustomer(owner, sur.id)).toEqual(sur)
  })

  test('unknown customer is not found', async () => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      updateCustomer(owner, crypto.randomUUID(), { name: 'X' }),
    )
    expect(error.code).toBe('not_found')
    expect(error.message).toBe(notFound)
  })

  test('staff cannot update', async () => {
    const { owner, staff } = await setupActors()
    const created = await createCustomer(owner, { name: 'Norte' })
    const error = await errorOf(() =>
      updateCustomer(staff, created.id, { name: 'Otro' }),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect(await getCustomer(owner, created.id)).toEqual(created)
  })
})

describe('listCustomers and getCustomer', () => {
  test('the owner filters by active; staff only ever see active customers', async () => {
    const { owner, staff } = await setupActors()
    const norte = await createCustomer(owner, { name: 'Norte' })
    const sur = await createCustomer(owner, { name: 'Sur' })
    const off = await updateCustomer(owner, sur.id, { active: false })
    expect((await listCustomers(owner)).map((c) => c.name)).toEqual([
      'Norte',
      'Sur',
    ])
    expect(await listCustomers(owner, { active: true })).toEqual([norte])
    expect(await listCustomers(owner, { active: false })).toEqual([off])
    expect(await listCustomers(staff)).toEqual([norte])
    expect(await listCustomers(staff, { active: false })).toEqual([norte])
    const error = await errorOf(() => getCustomer(staff, sur.id))
    expect(error.code).toBe('not_found')
    expect(error.message).toBe(notFound)
    expect(await getCustomer(owner, sur.id)).toEqual(off)
  })
})

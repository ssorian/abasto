import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import {
  createSupplier,
  listSuppliers,
  updateSupplier,
} from '#/modules/catalog/services/suppliers'
import {
  counts,
  errorOf,
  setupActors,
} from '#/modules/catalog/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

describe('createSupplier', () => {
  test('the owner creates a supplier with a trimmed name; staff can read it', async () => {
    const { owner, staff } = await setupActors()
    const created = await createSupplier(owner, {
      name: '  Alpura ',
      phone: '555',
    })
    expect(created.name).toBe('Alpura')
    expect(created.phone).toBe('555')
    expect(created.active).toBe(true)
    expect(await listSuppliers(staff)).toEqual([created])
  })

  test('rejects a duplicate name regardless of case and spaces', async () => {
    const { owner } = await setupActors()
    await createSupplier(owner, { name: 'Alpura' })
    const error = await errorOf(() =>
      createSupplier(owner, { name: ' ALPURA' }),
    )
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('Ya existe un proveedor con ese nombre.')
    expect((await counts()).suppliers).toBe(1)
  })

  test('rejects an empty name', async () => {
    const { owner } = await setupActors()
    const error = await errorOf(() => createSupplier(owner, { name: '  ' }))
    expect(error.code).toBe('invalid')
    expect(error.message).toBe('Escribe el nombre del proveedor.')
    expect((await counts()).suppliers).toBe(0)
  })

  test('staff cannot create suppliers', async () => {
    const { staff } = await setupActors()
    const error = await errorOf(() => createSupplier(staff, { name: 'Lala' }))
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect((await counts()).suppliers).toBe(0)
  })
})

describe('updateSupplier', () => {
  test('updates fields and can deactivate', async () => {
    const { owner } = await setupActors()
    const supplier = await createSupplier(owner, { name: 'Lala' })
    const updated = await updateSupplier(owner, supplier.id, {
      name: 'Lala Norte',
      contact: 'Ana',
      active: false,
    })
    expect(updated).toMatchObject({
      name: 'Lala Norte',
      contact: 'Ana',
      active: false,
    })
    expect(await listSuppliers(owner)).toEqual([updated])
  })

  test('keeping its own name in another case is allowed', async () => {
    const { owner } = await setupActors()
    const supplier = await createSupplier(owner, { name: 'Lala' })
    const updated = await updateSupplier(owner, supplier.id, { name: 'LALA' })
    expect(updated.name).toBe('LALA')
  })

  test('rejects a name used by another supplier and leaves rows unchanged', async () => {
    const { owner } = await setupActors()
    await createSupplier(owner, { name: 'Alpura' })
    const lala = await createSupplier(owner, { name: 'Lala' })
    const before = await listSuppliers(owner)
    const error = await errorOf(() =>
      updateSupplier(owner, lala.id, { name: 'alpura' }),
    )
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('Ya existe un proveedor con ese nombre.')
    expect(await listSuppliers(owner)).toEqual(before)
  })

  test('rejects an empty name and an unknown supplier', async () => {
    const { owner } = await setupActors()
    const lala = await createSupplier(owner, { name: 'Lala' })
    const empty = await errorOf(() =>
      updateSupplier(owner, lala.id, { name: ' ' }),
    )
    expect(empty.code).toBe('invalid')
    expect(empty.message).toBe('Escribe el nombre del proveedor.')
    const missing = await errorOf(() =>
      updateSupplier(owner, crypto.randomUUID(), { notes: 'x' }),
    )
    expect(missing.code).toBe('not_found')
    expect(missing.message).toBe('No encontramos ese proveedor.')
    expect((await listSuppliers(owner))[0]?.name).toBe('Lala')
  })

  test('staff cannot update suppliers', async () => {
    const { owner, staff } = await setupActors()
    const lala = await createSupplier(owner, { name: 'Lala' })
    const error = await errorOf(() =>
      updateSupplier(staff, lala.id, { name: 'Otro' }),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect((await listSuppliers(owner))[0]?.name).toBe('Lala')
  })
})

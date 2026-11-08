import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { listCommercialRules } from '#/modules/customers/services/commercial-rules'
import {
  getCustomer,
  listCustomers,
} from '#/modules/customers/services/customers'
import {
  customerCounts,
  createPresentations,
  errorOf,
  setupActors,
} from '#/modules/customers/services/testing'
import { saveCustomer } from '#/modules/customers/server/save-customer'
import type { SaveCustomerInput } from '#/modules/customers/lib/customer-inputs'

beforeEach(() => resetDatabase(db))

const base: SaveCustomerInput = {
  name: 'Distribuidora Norte',
  contact: 'Ana',
  phone: '555',
  notes: '',
  addresses: ['Calle 1'],
  active: true,
  rules: [],
}

describe('saveCustomer', () => {
  test('the owner creates a customer with rules in one call', async () => {
    const { owner } = await setupActors()
    const { box } = await createPresentations(owner)
    const saved = await saveCustomer(owner, {
      ...base,
      rules: [{ presentationId: box, minQuantity: 5, discountBps: 1000 }],
    })
    expect(saved.customer).toMatchObject({ name: 'Distribuidora Norte' })
    expect(saved.rules).toEqual([
      expect.objectContaining({ presentationId: box, discountBps: 1000 }),
    ])
  })

  test('editing updates fields, deactivates and replaces the rules', async () => {
    const { owner } = await setupActors()
    const { box, piece } = await createPresentations(owner)
    const first = await saveCustomer(owner, {
      ...base,
      rules: [{ presentationId: box, minQuantity: 5, discountBps: 1000 }],
    })
    const edited = await saveCustomer(owner, {
      ...base,
      id: first.customer.id,
      name: 'Norte SA',
      active: false,
      rules: [{ presentationId: piece, minQuantity: 1, priceCents: 900 }],
    })
    expect(edited.customer).toMatchObject({
      name: 'Norte SA',
      active: false,
    })
    expect(await listCommercialRules(owner, first.customer.id)).toEqual([
      expect.objectContaining({
        presentationId: piece,
        priceCents: 900,
        discountBps: null,
      }),
    ])
    expect(await customerCounts()).toEqual({ customers: 1, rules: 1 })
  })

  test('staff cannot create or edit and nothing changes', async () => {
    const { owner, staff } = await setupActors()
    const created = await saveCustomer(owner, base)
    expect((await errorOf(() => saveCustomer(staff, base))).message).toBe(
      'No tienes permiso para esta acción.',
    )
    expect(
      (
        await errorOf(() =>
          saveCustomer(staff, {
            ...base,
            id: created.customer.id,
            name: 'Otro',
          }),
        )
      ).code,
    ).toBe('forbidden')
    expect((await getCustomer(owner, created.customer.id)).name).toBe(
      'Distribuidora Norte',
    )
    expect(await customerCounts()).toEqual({ customers: 1, rules: 0 })
  })

  test('a duplicate name is reported and creates nothing', async () => {
    const { owner } = await setupActors()
    await saveCustomer(owner, base)
    expect(
      (
        await errorOf(() =>
          saveCustomer(owner, { ...base, name: 'distribuidora norte' }),
        )
      ).message,
    ).toBe('Ya existe un cliente con ese nombre.')
    expect((await listCustomers(owner)).length).toBe(1)
  })

  test('a failure after creating says the customer exists', async () => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      saveCustomer(owner, {
        ...base,
        rules: [
          {
            presentationId: '00000000-0000-4000-8000-000000000000',
            minQuantity: 1,
            discountBps: 500,
          },
        ],
      }),
    )
    expect(error.code).toBe('not_found')
    expect(error.message).toBe(
      'El cliente se creó, pero no se guardaron sus condiciones: No encontramos esa presentación.',
    )
    expect((await listCustomers(owner)).length).toBe(1)
  })

  test('editing an unknown customer is not found', async () => {
    const { owner } = await setupActors()
    expect(
      (
        await errorOf(() =>
          saveCustomer(owner, {
            ...base,
            id: '00000000-0000-4000-8000-000000000000',
          }),
        )
      ).message,
    ).toBe('No encontramos ese cliente.')
  })
})

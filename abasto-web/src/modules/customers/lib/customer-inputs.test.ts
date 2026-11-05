import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import { AppError } from '#/lib/errors'
import {
  customerOrdersInput,
  saveCustomerInput,
} from '#/modules/customers/lib/customer-inputs'

const valid = {
  name: 'La Esquinita',
  contact: '',
  phone: '',
  notes: '',
  addresses: [],
  active: true,
  credit: { enabled: false, limitCents: 0, termsDays: 0 },
  rules: [{ presentationId: 'p1', minQuantity: 5, discountBps: 1000 }],
}
const fails = (schema: Parameters<typeof parseInput>[0], data: unknown) => {
  try {
    parseInput(schema, data)
  } catch (error) {
    return error instanceof AppError && error.code === 'invalid'
  }
  return false
}

describe('customer server function inputs', () => {
  test('accepts a create and an edit', () => {
    expect(parseInput(saveCustomerInput, valid)).toEqual(valid)
    expect(parseInput(saveCustomerInput, { ...valid, id: 'c1' }).id).toBe('c1')
  })

  test('rejects malformed shapes', () => {
    expect(fails(saveCustomerInput, { ...valid, name: 5 })).toBe(true)
    expect(fails(saveCustomerInput, { ...valid, credit: undefined })).toBe(true)
    expect(
      fails(saveCustomerInput, {
        ...valid,
        credit: { enabled: 'sí', limitCents: 0, termsDays: 0 },
      }),
    ).toBe(true)
    expect(
      fails(saveCustomerInput, {
        ...valid,
        rules: [{ presentationId: 'p1', minQuantity: 1.5 }],
      }),
    ).toBe(true)
    expect(fails(saveCustomerInput, { ...valid, addresses: 'Calle 1' })).toBe(
      true,
    )
  })

  test('orders of a customer need an id', () => {
    expect(parseInput(customerOrdersInput, { customerId: 'c1' })).toEqual({
      customerId: 'c1',
    })
    expect(fails(customerOrdersInput, {})).toBe(true)
    expect(fails(customerOrdersInput, { customerId: '' })).toBe(true)
  })
})

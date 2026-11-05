import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import { AppError } from '#/lib/errors'
import {
  abonoInput,
  authorizationIdInput,
  customerIdInput,
  receivablesInput,
} from '#/modules/credit/server/credit-inputs'

const fails = (schema: Parameters<typeof parseInput>[0], data: unknown) => {
  try {
    parseInput(schema, data)
  } catch (error) {
    return error instanceof AppError && error.code === 'invalid'
  }
  return false
}

describe('credit server function inputs', () => {
  test('accept the documented shapes', () => {
    expect(parseInput(receivablesInput, {})).toEqual({})
    expect(parseInput(receivablesInput, { warehouseId: 'w' })).toEqual({
      warehouseId: 'w',
    })
    expect(parseInput(customerIdInput, { customerId: 'c' })).toEqual({
      customerId: 'c',
    })
    expect(parseInput(authorizationIdInput, { authorizationId: 'a' })).toEqual({
      authorizationId: 'a',
    })
    expect(
      parseInput(abonoInput, {
        warehouseId: 'w',
        customerId: 'c',
        amountCents: 2500,
      }),
    ).toEqual({ warehouseId: 'w', customerId: 'c', amountCents: 2500 })
  })

  test('reject malformed shapes (amount rules stay in the service)', () => {
    expect(fails(customerIdInput, {})).toBe(true)
    expect(fails(authorizationIdInput, { authorizationId: '' })).toBe(true)
    expect(
      fails(abonoInput, {
        warehouseId: 'w',
        customerId: 'c',
        amountCents: 1.2,
      }),
    ).toBe(true)
    expect(fails(abonoInput, { warehouseId: 'w', amountCents: 100 })).toBe(true)
  })
})

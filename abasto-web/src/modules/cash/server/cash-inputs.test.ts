import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import { AppError } from '#/lib/errors'
import {
  closeCashInput,
  openCashInput,
  cashMovementInput,
  warehouseInput,
} from '#/modules/cash/server/cash-inputs'

const fails = (schema: Parameters<typeof parseInput>[0], data: unknown) => {
  try {
    parseInput(schema, data)
  } catch (error) {
    return error instanceof AppError && error.code === 'invalid'
  }
  return false
}

describe('cash server function inputs', () => {
  test('accept the documented shapes', () => {
    expect(parseInput(warehouseInput, { warehouseId: 'w' })).toEqual({
      warehouseId: 'w',
    })
    expect(
      parseInput(openCashInput, { warehouseId: 'w', openingCents: 5000 }),
    ).toEqual({ warehouseId: 'w', openingCents: 5000 })
    expect(
      parseInput(closeCashInput, { warehouseId: 'w', countedCents: 0 }),
    ).toEqual({ warehouseId: 'w', countedCents: 0 })
    expect(
      parseInput(closeCashInput, {
        warehouseId: 'w',
        countedCents: 0,
        note: 'Faltó cambio',
      }),
    ).toEqual({ warehouseId: 'w', countedCents: 0, note: 'Faltó cambio' })
    expect(
      parseInput(cashMovementInput, {
        warehouseId: 'w',
        amountCents: 100,
        reason: 'Cambio',
      }),
    ).toEqual({ warehouseId: 'w', amountCents: 100, reason: 'Cambio' })
  })

  test('reject missing ids, fractional cents and missing reasons', () => {
    expect(fails(warehouseInput, {})).toBe(true)
    expect(fails(openCashInput, { warehouseId: 'w', openingCents: 1.5 })).toBe(
      true,
    )
    expect(fails(closeCashInput, { warehouseId: 'w' })).toBe(true)
    expect(
      fails(cashMovementInput, { warehouseId: 'w', amountCents: 100 }),
    ).toBe(true)
  })
})

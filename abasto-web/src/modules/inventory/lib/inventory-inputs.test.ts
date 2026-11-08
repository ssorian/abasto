import { describe, expect, test } from 'bun:test'
import { AppError } from '#/lib/errors'
import { parseInput } from '#/lib/boundary'
import {
  adjustInput,
  countInput,
  lossInput,
  minimumInput,
  overviewInput,
  purchaseInput,
  standardPricesInput,
} from '#/modules/inventory/lib/inventory-inputs'

const fails = (schema: Parameters<typeof parseInput>[0], data: unknown) => {
  try {
    parseInput(schema, data)
  } catch (error) {
    return error instanceof AppError && error.code === 'invalid'
  }
  return false
}

describe('server function input shapes', () => {
  test('overview takes an optional warehouse id', () => {
    expect(parseInput(overviewInput, {})).toEqual({})
    expect(parseInput(overviewInput, { warehouseId: 'w1' })).toEqual({
      warehouseId: 'w1',
    })
    expect(fails(overviewInput, { warehouseId: 5 })).toBe(true)
  })

  test('purchase accepts the service shape and rejects fractional numbers', () => {
    const valid = {
      supplierId: 's1',
      warehouseId: 'w1',
      purchasedOn: '2026-11-04',
      lines: [{ productId: 'p1', quantity: 10, totalCostCents: 1500 }],
    }
    expect(parseInput(purchaseInput, valid)).toEqual(valid)
    expect(
      fails(purchaseInput, {
        ...valid,
        lines: [{ productId: 'p1', quantity: 1.5, totalCostCents: 1500 }],
      }),
    ).toBe(true)
    expect(fails(purchaseInput, { ...valid, lines: 'x' })).toBe(true)
  })

  test('purchase keeps the optional sale price per box', () => {
    const withPrice = {
      supplierId: 's1',
      warehouseId: 'w1',
      purchasedOn: '2026-11-04',
      lines: [
        {
          productId: 'p1',
          quantity: 24,
          totalCostCents: 6000,
          salePriceCents: 3600,
        },
      ],
    }
    expect(parseInput(purchaseInput, withPrice)).toEqual(withPrice)
    expect(
      fails(purchaseInput, {
        ...withPrice,
        lines: [{ ...withPrice.lines[0], salePriceCents: 36.5 }],
      }),
    ).toBe(true)
  })

  test('adjust, loss, count and minimum', () => {
    expect(
      parseInput(adjustInput, { lotId: 'l', quantity: -2, reason: 'x' }),
    ).toEqual({
      lotId: 'l',
      quantity: -2,
      reason: 'x',
    })
    expect(
      parseInput(lossInput, {
        lotId: 'l',
        quantity: 2,
        category: 'otro',
        reason: 'x',
      }).category,
    ).toBe('otro')
    expect(
      fails(lossInput, {
        lotId: 'l',
        quantity: 2,
        category: 'robo',
        reason: 'x',
      }),
    ).toBe(true)
    expect(
      parseInput(countInput, {
        productId: 'p',
        warehouseId: 'w',
        countedQuantity: 0,
      }),
    ).toEqual({ productId: 'p', warehouseId: 'w', countedQuantity: 0 })
    expect(
      parseInput(minimumInput, { productId: 'p', warehouseId: 'w', minimum: 3 })
        .minimum,
    ).toBe(3)
    expect(fails(minimumInput, { productId: 'p', warehouseId: 'w' })).toBe(true)
  })

  test('standard prices take a warehouse id', () => {
    expect(parseInput(standardPricesInput, { warehouseId: 'w1' })).toEqual({
      warehouseId: 'w1',
    })
    expect(fails(standardPricesInput, {})).toBe(true)
  })
})

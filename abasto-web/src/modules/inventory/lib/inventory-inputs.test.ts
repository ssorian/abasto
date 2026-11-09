import { describe, expect, test } from 'bun:test'
import { AppError } from '#/lib/errors'
import { parseInput } from '#/lib/boundary'
import {
  adjustInput,
  countInput,
  lossInput,
  minimumInput,
  orderIdInput,
  overviewInput,
  pendingsInput,
  receiveOrderInput,
  returnInput,
  supplierOrderInput,
  supplierOrdersInput,
  writeOffInput,
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

describe('supplier order input shapes', () => {
  test('an order takes boxes per product and rejects fractions', () => {
    const valid = {
      supplierId: 's1',
      warehouseId: 'w1',
      expectedOn: '2026-11-10',
      lines: [{ productId: 'p1', boxes: 3 }],
    }
    expect(parseInput(supplierOrderInput, valid)).toEqual(valid)
    expect(
      fails(supplierOrderInput, {
        ...valid,
        lines: [{ productId: 'p1', boxes: 1.5 }],
      }),
    ).toBe(true)
    // A typed cost is not part of the shape: it never reaches the service.
    expect(
      parseInput(supplierOrderInput, {
        ...valid,
        lines: [{ productId: 'p1', boxes: 1, grossCostCents: 12055 }],
      }),
    ).toEqual({ ...valid, lines: [{ productId: 'p1', boxes: 1 }] })
    expect(fails(supplierOrderInput, { ...valid, supplierId: '' })).toBe(true)
  })

  test('reception takes boxes per line and optional replacements', () => {
    const valid = {
      purchaseId: 'o1',
      lines: [{ lineId: 'l1', missingBoxes: 4, damagedBoxes: 1 }],
      replacements: [{ pendingId: 'b1', boxes: 2 }],
    }
    expect(parseInput(receiveOrderInput, valid)).toEqual(valid)
    expect(
      parseInput(receiveOrderInput, { purchaseId: 'o1', lines: [] }),
    ).toEqual({ purchaseId: 'o1', lines: [] })
    expect(
      fails(receiveOrderInput, {
        ...valid,
        lines: [{ lineId: 'l1', missingBoxes: 1.5, damagedBoxes: 0 }],
      }),
    ).toBe(true)
  })

  test('queue, order id, pendings and write-off', () => {
    expect(
      parseInput(supplierOrdersInput, { warehouseId: 'w1', status: 'Pedido' }),
    ).toEqual({ warehouseId: 'w1', status: 'Pedido' })
    expect(
      fails(supplierOrdersInput, { warehouseId: 'w1', status: 'Otro' }),
    ).toBe(true)
    expect(parseInput(orderIdInput, { purchaseId: 'o1' })).toEqual({
      purchaseId: 'o1',
    })
    expect(fails(orderIdInput, {})).toBe(true)
    expect(parseInput(pendingsInput, {})).toEqual({})
    const writeOff = { pendingId: 'b1', boxes: 2 }
    expect(parseInput(writeOffInput, writeOff)).toEqual(writeOff)
    expect(fails(writeOffInput, { ...writeOff, boxes: 0.5 })).toBe(true)
    const giveBack = {
      pendingId: 'b2',
      boxes: 1,
      resolution: 'discount' as const,
      creditCents: 500,
    }
    expect(parseInput(returnInput, giveBack)).toEqual(giveBack)
    expect(fails(returnInput, { ...giveBack, resolution: 'gift' })).toBe(true)
    expect(
      parseInput(supplierOrderInput, {
        supplierId: 's1',
        warehouseId: 'w1',
        lines: [{ productId: 'p1', boxes: 1 }],
        discounts: [{ pendingId: 'b1' }],
      }).discounts,
    ).toEqual([{ pendingId: 'b1' }])
  })
})

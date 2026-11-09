import { describe, expect, test } from 'bun:test'
import {
  divideHalfUp,
  lineShareCents,
  openOf,
  settleBoxes,
  valueUpTo,
} from '#/modules/inventory/lib/pending-value'
import { orderCode } from '#/modules/inventory/lib/order-code'

describe('divideHalfUp', () => {
  test('rounds halves up', () => {
    expect(divideHalfUp(5n, 2n)).toBe(3)
    expect(divideHalfUp(4n, 3n)).toBe(1)
    expect(divideHalfUp(7n, 3n)).toBe(2)
  })
})

describe('lineShareCents', () => {
  test('values a share of the line cost with a single rounding', () => {
    expect(lineShareCents(13440, 24, 120)).toBe(2688)
    expect(lineShareCents(100, 1, 3)).toBe(33)
    expect(lineShareCents(100, 2, 3)).toBe(67)
  })
})

describe('valueUpTo', () => {
  test('the whole value at the end, a half-up share before', () => {
    expect(valueUpTo(3, 100, 0)).toBe(0)
    expect(valueUpTo(3, 100, 1)).toBe(33)
    expect(valueUpTo(3, 100, 2)).toBe(67)
    expect(valueUpTo(3, 100, 3)).toBe(100)
  })
})

describe('settling boxes of an origin entry', () => {
  const entry = {
    quantity: 36,
    valueCents: 100,
    settledUnits: 0,
    settledValueCents: 0,
    boxFactor: 12,
  }

  test('counts open units and boxes', () => {
    expect(openOf(entry)).toEqual({ units: 36, boxes: 3 })
    expect(openOf({ ...entry, settledUnits: 12 })).toEqual({
      units: 24,
      boxes: 2,
    })
  })

  test('settling in pieces adds up to the exact value', () => {
    let settledUnits = 0
    let settledValueCents = 0
    for (let i = 0; i < 3; i++) {
      const next = settleBoxes(
        { ...entry, settledUnits, settledValueCents },
        1,
      )!
      settledUnits += next.units
      settledValueCents += next.valueCents
    }
    expect([settledUnits, settledValueCents]).toEqual([36, 100])
  })

  test('refuses more boxes than are open and keeps the factor of the entry', () => {
    expect(settleBoxes(entry, 4)).toBeNull()
    expect(settleBoxes(entry, 2)).toEqual({ units: 24, valueCents: 67 })
  })
})

describe('orderCode', () => {
  test('is the reference, else PED- plus the padded folio', () => {
    expect(orderCode({ reference: ' F-12 ', folio: 3 })).toBe('F-12')
    expect(orderCode({ reference: '', folio: 3 })).toBe('PED-0003')
    expect(orderCode({ reference: '  ', folio: 12345 })).toBe('PED-12345')
  })
})

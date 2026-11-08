import { describe, expect, test } from 'bun:test'

import { describeQuantity, splitBoxes } from './box-quantities'

describe('splitBoxes', () => {
  test('splits base units into whole boxes and loose units', () => {
    expect(splitBoxes(500, 12)).toEqual({ boxes: 41, units: 8 })
    expect(splitBoxes(24, 12)).toEqual({ boxes: 2, units: 0 })
    expect(splitBoxes(5, 12)).toEqual({ boxes: 0, units: 5 })
  })

  test('a box of one unit has no boxes', () => {
    expect(splitBoxes(7, 1)).toEqual({ boxes: 0, units: 7 })
  })
})

describe('describeQuantity', () => {
  test('writes boxes and units in Spanish', () => {
    expect(describeQuantity(500, 12)).toBe('41 cajas y 8 unidades')
    expect(describeQuantity(13, 12)).toBe('1 caja y 1 unidad')
    expect(describeQuantity(24, 12)).toBe('2 cajas')
    expect(describeQuantity(5, 12)).toBe('5 unidades')
    expect(describeQuantity(0, 12)).toBe('0 unidades')
    expect(describeQuantity(7, 1)).toBe('7 unidades')
  })
})

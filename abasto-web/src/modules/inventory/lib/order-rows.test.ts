import { describe, expect, test } from 'bun:test'
import {
  belowMinimumLabel,
  isBelowMinimum,
  onlyWithBoxes,
  sortBelowMinimumFirst,
  splitIntoBoxes,
  stockLabel,
} from '#/modules/inventory/lib/order-rows'

describe('splitIntoBoxes', () => {
  test('whole boxes and leftover pieces', () => {
    expect(splitIntoBoxes(40, 12)).toEqual({ boxes: 3, pieces: 4 })
    expect(splitIntoBoxes(36, 12)).toEqual({ boxes: 3, pieces: 0 })
    expect(splitIntoBoxes(5, 12)).toEqual({ boxes: 0, pieces: 5 })
    expect(splitIntoBoxes(0, 12)).toEqual({ boxes: 0, pieces: 0 })
  })

  test('a factor below one counts as pieces', () => {
    expect(splitIntoBoxes(7, 0)).toEqual({ boxes: 7, pieces: 0 })
  })
})

describe('stockLabel', () => {
  test('reads boxes, with leftover pieces when any', () => {
    expect(stockLabel(36, 12)).toBe('3 cajas')
    expect(stockLabel(40, 12)).toBe('3 cajas + 4 pz')
    expect(stockLabel(12, 12)).toBe('1 caja')
    expect(stockLabel(13, 12)).toBe('1 caja + 1 pz')
    expect(stockLabel(5, 12)).toBe('5 pz')
    expect(stockLabel(0, 12)).toBe('0 cajas')
  })
})

describe('isBelowMinimum', () => {
  test('needs a minimum and less available than it', () => {
    expect(isBelowMinimum({ available: 59, minimum: 60 })).toBe(true)
    expect(isBelowMinimum({ available: 60, minimum: 60 })).toBe(false)
    expect(isBelowMinimum({ available: 0, minimum: 0 })).toBe(false)
    expect(isBelowMinimum(undefined)).toBe(false)
  })
})

describe('belowMinimumLabel', () => {
  test('names the minimum in boxes', () => {
    expect(belowMinimumLabel({ available: 36, minimum: 60 }, 12)).toBe(
      'Bajo mínimo (5 cajas)',
    )
    expect(belowMinimumLabel({ available: 1, minimum: 62 }, 12)).toBe(
      'Bajo mínimo (5 cajas + 2 pz)',
    )
  })

  test('is absent when not below the minimum', () => {
    expect(belowMinimumLabel({ available: 60, minimum: 60 }, 12)).toBeNull()
    expect(belowMinimumLabel(undefined, 12)).toBeNull()
  })
})

describe('sortBelowMinimumFirst', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const stock = {
    b: { available: 1, minimum: 10 },
    c: { available: 50, minimum: 10 },
    d: { available: 0, minimum: 5 },
  }

  test('below-minimum rows first, the rest keep their order', () => {
    expect(sortBelowMinimumFirst(list, stock).map((p) => p.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ])
  })

  test('keeps the order while stock is unknown', () => {
    expect(sortBelowMinimumFirst(list, undefined).map((p) => p.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  test('does not mutate the input', () => {
    sortBelowMinimumFirst(list, stock)
    expect(list.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('onlyWithBoxes', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  test('keeps rows with boxes above zero', () => {
    expect(
      onlyWithBoxes(list, { a: '2', b: '0', c: 'x' }).map((p) => p.id),
    ).toEqual(['a'])
    expect(onlyWithBoxes(list, {})).toEqual([])
  })
})

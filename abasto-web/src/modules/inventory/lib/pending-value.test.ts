import { describe, expect, test } from 'bun:test'
import {
  divideHalfUp,
  fifoValueCents,
  lineShareCents,
} from '#/modules/inventory/lib/pending-value'

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

describe('fifoValueCents', () => {
  const entries = [
    { quantity: 12, valueCents: 1200 },
    { quantity: 12, valueCents: 2400 },
  ]
  test('takes the oldest units at their own cost', () => {
    expect(fifoValueCents(entries, 0, 6)).toBe(600)
    expect(fifoValueCents(entries, 6, 12)).toBe(600 + 1200)
  })
  test('settling everything adds up to the owed total', () => {
    const odd = [{ quantity: 3, valueCents: 100 }]
    const parts = [1, 1, 1].reduce(
      (sum, units) => ({
        total: sum.total + fifoValueCents(odd, sum.settled, units),
        settled: sum.settled + units,
      }),
      { total: 0, settled: 0 },
    )
    expect(parts.total).toBe(100)
  })
  test('is zero when nothing is taken', () => {
    expect(fifoValueCents(entries, 0, 0)).toBe(0)
  })
})

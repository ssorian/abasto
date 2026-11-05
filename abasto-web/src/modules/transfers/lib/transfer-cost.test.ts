import { describe, expect, test } from 'bun:test'
import { transferredCostCents } from '#/modules/transfers/lib/transfer-cost'

describe('transferredCostCents', () => {
  test('keeps the unit cost: the whole lot moves its whole cost', () => {
    expect(transferredCostCents(1000, 3, 3)).toBe(1000)
  })

  test('prorates and rounds half up once', () => {
    expect(transferredCostCents(1000, 3, 2)).toBe(667)
    expect(transferredCostCents(1000, 3, 1)).toBe(333)
    expect(transferredCostCents(5, 2, 1)).toBe(3)
  })

  test('does not lose precision near the int4 limits', () => {
    expect(transferredCostCents(2147483647, 2147483647, 2147483646)).toBe(
      2147483646,
    )
  })

  test('a free lot stays free', () => {
    expect(transferredCostCents(0, 10, 4)).toBe(0)
  })
})

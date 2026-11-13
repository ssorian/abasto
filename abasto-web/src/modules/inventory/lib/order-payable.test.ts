import { describe, expect, test } from 'bun:test'
import { showsPayable } from '#/modules/inventory/lib/order-payable'

describe('showsPayable', () => {
  test('shows "a pagar" only when it differs from the total', () => {
    expect(showsPayable({ totalCostCents: 1000, payableCents: 1000 })).toBe(
      false,
    )
    expect(showsPayable({ totalCostCents: 1000, payableCents: 800 })).toBe(true)
  })
})

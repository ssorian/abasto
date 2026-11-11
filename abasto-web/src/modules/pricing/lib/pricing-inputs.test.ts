import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import {
  historyInput,
  setPricesInput,
} from '#/modules/pricing/lib/pricing-inputs'

describe('pricing server inputs', () => {
  test('accepts the shapes the UI sends', () => {
    expect(
      parseInput(setPricesInput, {
        warehouseId: 'w',
        prices: [{ presentationId: 'a', priceCents: 100 }],
      }).prices,
    ).toHaveLength(1)
    expect(
      parseInput(historyInput, { warehouseId: 'w', presentationId: 'a' })
        .presentationId,
    ).toBe('a')
  })

  test('rejects malformed input with a Spanish message', () => {
    expect(() =>
      parseInput(setPricesInput, {
        warehouseId: 'w',
        prices: [{ presentationId: 'a', priceCents: 1.5 }],
      }),
    ).toThrow('Revisa el campo «prices.0.priceCents».')
  })
})

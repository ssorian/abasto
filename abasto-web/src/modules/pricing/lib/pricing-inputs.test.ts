import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import {
  bulkChangeInput,
  historyInput,
  marginInput,
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
      parseInput(bulkChangeInput, {
        warehouseIds: 'all',
        supplierId: 's',
        change: { kind: 'percent', bps: 500 },
      }).warehouseIds,
    ).toBe('all')
    expect(
      parseInput(bulkChangeInput, {
        warehouseIds: ['w'],
        change: { kind: 'fixed', cents: -50 },
      }).change,
    ).toEqual({ kind: 'fixed', cents: -50 })
    expect(
      parseInput(marginInput, { productId: 'p', marginBps: 1200 }).marginBps,
    ).toBe(1200)
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
    ).toThrow('Revisa los datos')
    expect(() =>
      parseInput(bulkChangeInput, {
        warehouseIds: ['w'],
        change: { kind: 'bogus' },
      }),
    ).toThrow('Revisa los datos')
    expect(() =>
      parseInput(marginInput, { productId: 'p', marginBps: '12' }),
    ).toThrow('Revisa los datos')
  })
})

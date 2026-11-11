import { describe, expect, test } from 'bun:test'

import {
  listTotal,
  pricedTotal,
  quantityIn,
  resolveCartLines,
  unitPriceOf,
} from '#/modules/store/lib/pick-list'
import type { CartPreviewState } from '#/modules/store/hooks/use-cart-preview'
import type { StoreProduct } from '#/modules/store/services/storefront'

const catalog: Array<StoreProduct> = [
  {
    id: 'p1',
    name: 'Leche',
    brand: 'Lala',
    description: '',
    category: 'Lácteos',
    imageUrl: null,
    presentations: [
      {
        id: 'a',
        name: 'Pieza',
        factor: 1,
        isDefault: true,
        priceCents: 2000,
        availability: 'Disponible',
      },
      {
        id: 'b',
        name: 'Caja 12',
        factor: 12,
        isDefault: false,
        priceCents: 22000,
        availability: 'Pocas',
      },
    ],
  },
]

describe('resolveCartLines', () => {
  test('joins lines with the catalog and reports missing presentations', () => {
    const { resolved, gone } = resolveCartLines(catalog, [
      { presentationId: 'b', quantity: 2 },
      { presentationId: 'zzz', quantity: 1 },
    ])
    expect(resolved.map((l) => [l.presentation.id, l.quantity])).toEqual([
      ['b', 2],
    ])
    expect(gone).toEqual(['zzz'])
  })

  test('listTotal sums at list price', () => {
    const { resolved } = resolveCartLines(catalog, [
      { presentationId: 'a', quantity: 3 },
      { presentationId: 'b', quantity: 1 },
    ])
    expect(listTotal(resolved)).toBe(28000)
    expect(listTotal([])).toBe(0)
  })
})

test('quantityIn is zero when the line is absent', () => {
  const lines = [{ presentationId: 'a', quantity: 4 }]
  expect(quantityIn(lines, 'a')).toBe(4)
  expect(quantityIn(lines, 'b')).toBe(0)
})

describe('customer prices (bar and sheet read the same numbers)', () => {
  const { resolved } = resolveCartLines(catalog, [
    { presentationId: 'a', quantity: 3 },
    { presentationId: 'b', quantity: 2 },
  ])
  // List: 3 × 2000 + 2 × 22000 = 50000. The customer pays 10 % off the box.
  const ready: CartPreviewState = {
    status: 'ready',
    preview: {
      totalCents: 45600,
      lines: [
        { presentationId: 'a', unitPriceCents: 2000 },
        { presentationId: 'b', unitPriceCents: 19800 },
      ],
    } as never,
  }

  test('anonymous visitors see list prices', () => {
    expect(pricedTotal(resolved, false, { status: 'idle' })).toEqual({
      cents: 50000,
      pending: false,
    })
    expect(unitPriceOf(resolved[1], false, ready)).toBe(22000)
  })

  test('a signed-in customer sees the previewed total and unit price', () => {
    expect(pricedTotal(resolved, true, ready)).toEqual({
      cents: 45600,
      pending: false,
    })
    expect(unitPriceOf(resolved[1], true, ready)).toBe(19800)
  })

  test('while the customer price loads the total is pending, never the list price as final', () => {
    for (const status of ['idle', 'loading'] as const) {
      expect(pricedTotal(resolved, true, { status })).toMatchObject({
        pending: true,
      })
    }
  })

  test('an empty cart is never pending; a failed preview falls back to list', () => {
    expect(pricedTotal([], true, { status: 'idle' })).toEqual({
      cents: 0,
      pending: false,
    })
    expect(
      pricedTotal(resolved, true, { status: 'error', message: 'x' }),
    ).toEqual({ cents: 50000, pending: false })
  })
})

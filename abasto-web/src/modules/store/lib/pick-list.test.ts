import { describe, expect, test } from 'bun:test'

import {
  listTotal,
  quantityIn,
  resolveCartLines,
} from '#/modules/store/lib/pick-list'
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

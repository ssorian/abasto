import { describe, expect, test } from 'bun:test'
import { activeProducts } from '#/modules/inventory/lib/active-products'

describe('activeProducts', () => {
  test('drops archived products and keeps the order of the rest', () => {
    const all = [
      { id: 'a', archivedAt: null },
      { id: 'b', archivedAt: new Date('2026-11-01') },
      { id: 'c', archivedAt: null },
    ]
    expect(activeProducts(all).map((p) => p.id)).toEqual(['a', 'c'])
  })

  test('treats a missing archivedAt as active', () => {
    expect(activeProducts([{ id: 'a', archivedAt: undefined }])).toHaveLength(1)
  })
})

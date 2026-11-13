import { describe, expect, test } from 'bun:test'
import { filterProducts } from '#/lib/product-search'

const items = [
  { id: '1', name: 'Jabón líquido', sku: 'JAB-001' },
  { id: '2', name: 'Crema de manos', sku: 'CRE-002' },
  { id: '3', name: 'Jabón en barra', sku: 'JAB-003' },
]

describe('filterProducts', () => {
  test('returns everything for a blank query', () => {
    expect(filterProducts(items, '  ')).toEqual(items)
  })
  test('matches by name ignoring case and accents', () => {
    expect(filterProducts(items, 'JABON').map((i) => i.id)).toEqual(['1', '3'])
  })
  test('matches by SKU', () => {
    expect(filterProducts(items, 'cre-0').map((i) => i.id)).toEqual(['2'])
  })
  test('requires every typed word to match', () => {
    expect(filterProducts(items, 'jabon barra').map((i) => i.id)).toEqual(['3'])
  })
  test('returns nothing when no product matches', () => {
    expect(filterProducts(items, 'zzz')).toEqual([])
  })
})

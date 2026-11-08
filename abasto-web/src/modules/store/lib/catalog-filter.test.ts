import { describe, expect, test } from 'bun:test'

import {
  NO_BRAND,
  brandTabs,
  categoriesOf,
  filterProducts,
  inStockFirst,
} from '#/modules/store/lib/catalog-filter'
import type { StoreProduct } from '#/modules/store/services/storefront'

const product = (
  id: string,
  name: string,
  brand: string,
  category = 'Lácteos',
): StoreProduct => ({
  id,
  name,
  brand,
  description: '',
  category,
  imageUrl: null,
  presentations: [],
})

const catalog = [
  product('1', 'Leche entera', 'Lala'),
  product('2', 'Leche light', 'Lala'),
  product('3', 'Crema ácida', 'Alpura'),
  product('4', 'Agua de limón', 'Aquafrut', 'Bebidas'),
  product('5', 'Yogurt natural', ''),
]

describe('filterProducts', () => {
  test('matches name and brand ignoring accents and case', () => {
    expect(filterProducts(catalog, 'ACIDA').map((p) => p.id)).toEqual(['3'])
    expect(filterProducts(catalog, 'lala leche').map((p) => p.id)).toEqual([
      '1',
      '2',
    ])
  })

  test('combines brand and category filters', () => {
    expect(filterProducts(catalog, '', { brand: 'Lala' })).toHaveLength(2)
    expect(
      filterProducts(catalog, '', { brand: 'Lala', category: 'Bebidas' }),
    ).toHaveLength(0)
    expect(filterProducts(catalog, '', { brand: NO_BRAND })[0]?.id).toBe('5')
  })
})

describe('brandTabs', () => {
  test('counts products per brand, biggest first, and names the brandless', () => {
    expect(brandTabs(catalog)).toEqual([
      { value: 'Lala', label: 'Lala', count: 2 },
      { value: 'Alpura', label: 'Alpura', count: 1 },
      { value: 'Aquafrut', label: 'Aquafrut', count: 1 },
      { value: NO_BRAND, label: 'Sin marca', count: 1 },
    ])
  })
})

test('categoriesOf is unique and sorted', () => {
  expect(categoriesOf(catalog)).toEqual(['Bebidas', 'Lácteos'])
})

test('inStockFirst moves sold-out products last and keeps the rest in order', () => {
  const withStock = (id: string, availability: 'Disponible' | 'Agotado') => ({
    ...product(id, id, 'Lala'),
    presentations: [
      {
        id: `${id}-p`,
        name: 'Pieza',
        factor: 1,
        isDefault: true,
        priceCents: 100,
        availability,
      },
    ],
  })
  const list = [
    withStock('a', 'Agotado'),
    withStock('b', 'Disponible'),
    withStock('c', 'Agotado'),
    withStock('d', 'Disponible'),
  ]
  expect(inStockFirst(list).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c'])
})

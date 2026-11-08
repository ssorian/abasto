import { describe, expect, test } from 'bun:test'
import { filterCatalog } from '#/modules/catalog/lib/catalog-search'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

function product(
  name: string,
  supplierId: string | null,
  brand = '',
): CatalogProduct {
  return {
    id: name,
    name,
    brand,
    sku: `SKU-${name}`,
    supplierId,
    presentations: [],
  } as unknown as CatalogProduct
}

const products = [
  product('Leche entera', 'lala'),
  product('Leche light', 'alpura'),
  product('Crema', 'alpura'),
  product('Agua', null),
]
const names = (list: Array<CatalogProduct>) => list.map(({ name }) => name)

describe('filterCatalog by supplier', () => {
  test('empty supplier means all, including products without supplier', () => {
    expect(names(filterCatalog(products, ''))).toEqual([
      'Leche entera',
      'Leche light',
      'Crema',
      'Agua',
    ])
    expect(filterCatalog(products, '', '').length).toBe(4)
  })

  test('shows only that supplier products', () => {
    expect(names(filterCatalog(products, '', 'alpura'))).toEqual([
      'Leche light',
      'Crema',
    ])
  })

  test('combines with the text search (AND)', () => {
    expect(names(filterCatalog(products, 'leche', 'alpura'))).toEqual([
      'Leche light',
    ])
    expect(filterCatalog(products, 'agua', 'alpura')).toEqual([])
  })

  test('unknown supplier id yields no products', () => {
    expect(filterCatalog(products, '', 'missing')).toEqual([])
  })
})

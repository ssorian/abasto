import { describe, expect, test } from 'bun:test'
import {
  groupByProduct,
  joinProducts,
  originLabels,
  hasOwnPriceHistory,
  pendingPrices,
  pricePlaceholder,
  pricesByProduct,
} from '#/modules/pricing/lib/price-table'
import type { PriceTableRow } from '#/modules/pricing/lib/price-table'

const row = (over: Partial<PriceTableRow>): PriceTableRow => ({
  productId: 'p1',
  productName: 'Leche entera 1L',
  sku: 'LEC-9',
  category: 'Lácteos',
  presentationId: 'a',
  presentationName: 'Pieza',
  factor: 1,
  isDefault: true,
  priceCents: 2000,
  origin: 'own',
  supplierId: 's1',
  ...over,
})
const rows = [
  row({}),
  row({
    presentationId: 'b',
    presentationName: 'Caja',
    priceCents: 24000,
    origin: 'own',
  }),
  row({
    productId: 'p2',
    productName: 'Cola 600ml',
    sku: 'COL-1',
    category: 'Refrescos',
    presentationId: 'c',
    priceCents: null,
    origin: 'none',
    supplierId: 's2',
  }),
]

describe('price table', () => {
  test('labels the two origins', () => {
    expect(originLabels).toEqual({
      own: 'Propio',
      none: 'Sin precio',
    })
  })

  test('joins supplier ids from the catalog', () => {
    const joined = joinProducts(
      [{ ...rows[0], supplierId: undefined } as never],
      [{ id: 'p1', supplierId: 's9' }],
    )
    expect(joined[0].supplierId).toBe('s9')
  })

  test('indexes each product with its presentation prices for the cards', () => {
    const index = pricesByProduct(rows)
    expect(index.get('p1')?.rows.map((r) => r.presentationId)).toEqual([
      'a',
      'b',
    ])
    expect(index.get('p2')?.rows.map((r) => r.priceCents)).toEqual([null])
    expect(index.get('missing')).toBeUndefined()
  })

  test('groups presentations under their product', () => {
    const groups = groupByProduct(rows)
    expect(groups.map((g) => [g.productId, g.rows.length])).toEqual([
      ['p1', 2],
      ['p2', 1],
    ])
  })

  test('pending prices keep changed rows only and report bad inputs per row', () => {
    const result = pendingPrices(rows, { a: '20.00', b: '250', c: '1.005' })
    expect(result.prices).toEqual([{ presentationId: 'b', priceCents: 25000 }])
    expect(result.errors).toEqual({ c: 'Usa máximo 2 decimales.' })
    expect(pendingPrices(rows, { a: '' }).prices).toEqual([])
  })
})

describe('pricePlaceholder', () => {
  test('shows the current price plainly, or that there is none', () => {
    expect(pricePlaceholder(row({ origin: 'own', priceCents: 11400 }))).toBe(
      '114.00',
    )
    expect(pricePlaceholder(row({ origin: 'none', priceCents: null }))).toBe(
      'Sin precio',
    )
  })
})

describe('hasOwnPriceHistory', () => {
  test('only presentations with their own price have history to show', () => {
    expect(hasOwnPriceHistory(row({ origin: 'own' }))).toBe(true)
    expect(hasOwnPriceHistory(row({ origin: 'none' }))).toBe(false)
  })
})

import { describe, expect, test } from 'bun:test'
import {
  countAffected,
  filterPriceRows,
  groupByProduct,
  joinProducts,
  originLabels,
  pendingPrices,
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
    origin: 'derived',
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
  test('labels the three origins', () => {
    expect(originLabels).toEqual({
      own: 'Propio',
      derived: 'Derivado',
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

  test('filters by accent-insensitive text, supplier and category', () => {
    const none = { query: '', supplierId: '', category: '' }
    expect(filterPriceRows(rows, { ...none, query: 'lacteos' })).toHaveLength(0)
    expect(filterPriceRows(rows, { ...none, query: 'col-1' })).toHaveLength(1)
    expect(filterPriceRows(rows, { ...none, supplierId: 's1' })).toHaveLength(2)
    expect(
      filterPriceRows(rows, { ...none, category: 'Refrescos' }),
    ).toHaveLength(1)
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

  test('counts own prices that match the bulk scope', () => {
    expect(countAffected(rows, { supplierId: 's1' })).toBe(1)
    expect(countAffected(rows, { category: 'Refrescos' })).toBe(0)
    expect(countAffected(rows, { productIds: ['p1'] })).toBe(1)
    expect(countAffected(rows, {})).toBe(1)
  })
})

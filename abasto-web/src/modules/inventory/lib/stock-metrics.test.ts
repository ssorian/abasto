import { describe, expect, test } from 'bun:test'
import {
  EXPIRY_WARNING_DAYS,
  daysUntil,
  expiryState,
  filterStock,
  productStatus,
  warehouseMetrics,
} from '#/modules/inventory/lib/stock-metrics'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

const today = '2026-11-04'

function row(
  name: string,
  onHand: number,
  minimum: number,
  expiries: Array<string | null> = [],
): ProductStock {
  return {
    productId: name,
    name,
    sku: `SKU-${name}`,
    unit: 'piezas',
    onHand,
    inRoute: 0,
    reserved: 0,
    available: onHand,
    expired: 0,
    minimum,
    belowMinimum: minimum > 0 && onHand < minimum,
    lots: expiries.map((expiresOn, index) => ({
      id: `${name}-${index}`,
      code: '',
      expiresOn,
      receivedAt: new Date('2026-11-01T00:00:00Z'),
      onHand: 1,
    })),
  }
}

describe('expiry window', () => {
  test('the window is seven days', () => {
    expect(EXPIRY_WARNING_DAYS).toBe(7)
  })

  test('daysUntil counts calendar days', () => {
    expect(daysUntil('2026-11-04', today)).toBe(0)
    expect(daysUntil('2026-11-11', today)).toBe(7)
    expect(daysUntil('2026-11-03', today)).toBe(-1)
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1)
  })

  test('expiryState classifies lots around the boundary', () => {
    expect(expiryState(null, today)).toBe('none')
    expect(expiryState('2026-11-03', today)).toBe('expired')
    expect(expiryState('2026-11-04', today)).toBe('soon')
    expect(expiryState('2026-11-11', today)).toBe('soon')
    expect(expiryState('2026-11-12', today)).toBe('ok')
  })
})

describe('warehouseMetrics', () => {
  test('is all zeros for an empty warehouse', () => {
    expect(warehouseMetrics([], today)).toEqual({
      productsWithStock: 0,
      totalUnits: 0,
      belowMinimum: 0,
      expiringLots: 0,
      expiredLots: 0,
    })
  })

  test('derives counts from the stock read model', () => {
    const rows = [
      row('a', 10, 5, ['2026-11-05', '2026-12-01']),
      row('b', 2, 5, ['2026-11-11']),
      row('c', 0, 3),
      row('d', 40, 0, ['2026-10-30', null]),
    ]
    expect(warehouseMetrics(rows, today)).toEqual({
      productsWithStock: 3,
      totalUnits: 52,
      belowMinimum: 2,
      expiringLots: 2,
      expiredLots: 1,
    })
  })
})

describe('productStatus and filterStock', () => {
  const rows = [
    row('Leche entera', 10, 5),
    row('Refresco cola', 2, 5),
    row('Agua', 0, 4),
  ]

  test('productStatus', () => {
    expect(productStatus(rows[0])).toBe('Disponible')
    expect(productStatus(rows[1])).toBe('Stock bajo')
    expect(productStatus(rows[2])).toBe('Sin existencias')
  })

  test('stock that is only expired reads Vencido, not Sin existencias', () => {
    const expiredOnly = {
      ...row('Yogur', 12, 0, ['2020-01-01']),
      available: 0,
      expired: 12,
    }
    expect(productStatus(expiredOnly)).toBe('Vencido')
    expect(filterStock([expiredOnly, ...rows], '', 'Vencido')).toEqual([
      expiredOnly,
    ])
    expect(filterStock([expiredOnly, ...rows], '', 'Sin existencias')).toEqual([
      rows[2],
    ])
    // Nothing expired and nothing available stays Sin existencias.
    expect(productStatus({ ...rows[2], expired: 0 })).toBe('Sin existencias')
    // Good stock next to expired stock is still sellable.
    expect(productStatus({ ...rows[0], expired: 3 })).toBe('Disponible')
  })

  test('filters by status', () => {
    expect(filterStock(rows, '', 'Todos').length).toBe(3)
    // Under the minimum counts empty stock too, like Reports.
    expect(filterStock(rows, '', 'Stock bajo').map((r) => r.name)).toEqual([
      'Refresco cola',
      'Agua',
    ])
    expect(filterStock(rows, '', 'Sin existencias').map((r) => r.name)).toEqual(
      ['Agua'],
    )
  })

  test('search ignores case and accents and matches the SKU', () => {
    expect(filterStock(rows, 'LECHÉ', 'Todos').map((r) => r.name)).toEqual([
      'Leche entera',
    ])
    expect(filterStock(rows, 'sku-agua', 'Todos').map((r) => r.name)).toEqual([
      'Agua',
    ])
  })
})

describe('filterStock by supplier', () => {
  const rows = [
    row('Leche entera', 10, 5),
    row('Leche light', 2, 5),
    row('Crema', 0, 4),
    row('Agua', 3, 1),
  ]
  const supplierOf = new Map([
    ['Leche entera', 'lala'],
    ['Leche light', 'alpura'],
    ['Crema', 'alpura'],
  ])
  const names = (list: Array<ProductStock>) => list.map((r) => r.name)

  test('empty supplier means all, including products without supplier', () => {
    expect(filterStock(rows, '', 'Todos', '', supplierOf).length).toBe(4)
  })

  test('shows only that supplier products', () => {
    expect(names(filterStock(rows, '', 'Todos', 'alpura', supplierOf))).toEqual(
      ['Leche light', 'Crema'],
    )
  })

  test('combines with search and status (AND)', () => {
    expect(
      names(filterStock(rows, 'leche', 'Todos', 'alpura', supplierOf)),
    ).toEqual(['Leche light'])
    expect(
      names(filterStock(rows, '', 'Sin existencias', 'alpura', supplierOf)),
    ).toEqual(['Crema'])
    expect(filterStock(rows, '', 'Disponible', 'alpura', supplierOf)).toEqual(
      [],
    )
  })

  test('unknown supplier id yields no rows', () => {
    expect(filterStock(rows, '', 'Todos', 'missing', supplierOf)).toEqual([])
  })
})

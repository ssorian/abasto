import { describe, expect, test } from 'bun:test'

import {
  cashDifferenceSummary,
  compactMoney,
  dailySeries,
  nonMovingBuckets,
  previousTotals,
  relativeChangeBps,
  shortDay,
  stockAlertSummary,
  supplierShares,
  topProfitProducts,
} from '#/modules/reports/lib/owner-series'
import type {
  CashCutRow,
  LotAlertRow,
  LowStockRow,
  SalesRow,
} from '#/modules/reports/types/reports'

const day = (key: string, revenueCents: number, costCents = 0): SalesRow => ({
  key,
  name: key,
  orders: 1,
  units: 1,
  revenueCents,
  costCents,
  marginCents: revenueCents - costCents,
})

describe('relativeChangeBps', () => {
  test('is the change over the previous value in basis points', () => {
    expect(relativeChangeBps(1002, 1000)).toBe(20)
    expect(relativeChangeBps(959, 1000)).toBe(-410)
    expect(relativeChangeBps(1000, 1000)).toBe(0)
  })

  test('is unknown without a previous value to compare', () => {
    expect(relativeChangeBps(500, 0)).toBeNull()
    expect(relativeChangeBps(0, 0)).toBeNull()
  })
})

describe('previousTotals', () => {
  test('adds the previous figures of every warehouse', () => {
    const metrics = (revenue: number, cost: number, tickets: number) => ({
      revenueCents: revenue,
      costCents: cost,
      marginCents: revenue - cost,
      marginBps: null,
      tickets,
      averageTicketCents: 0,
    })
    const totals = previousTotals([
      { previous: metrics(1000, 600, 2) },
      { previous: metrics(500, 300, 3) },
    ])
    expect(totals.revenueCents).toBe(1500)
    expect(totals.marginCents).toBe(600)
    expect(totals.marginBps).toBe(4000)
    expect(totals.tickets).toBe(5)
    expect(totals.averageTicketCents).toBe(300)
  })
})

describe('dailySeries', () => {
  test('fills days without sales with zero and pairs the previous period by position', () => {
    const points = dailySeries(
      {
        range: { from: '2026-11-01', to: '2026-11-03' },
        rows: [day('2026-11-01', 1000, 700), day('2026-11-03', 500, 300)],
      },
      {
        range: { from: '2026-10-29', to: '2026-10-31' },
        rows: [day('2026-10-30', 800, 500)],
      },
    )
    expect(points.map((point) => point.day)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ])
    expect(points.map((point) => point.revenueCents)).toEqual([1000, 0, 500])
    expect(points.map((point) => point.marginCents)).toEqual([300, 0, 200])
    expect(points.map((point) => point.previousRevenueCents)).toEqual([
      0, 800, 0,
    ])
    expect(points[1]?.previousDay).toBe('2026-10-30')
  })

  test('averageTicket is revenue over orders and zero without orders', () => {
    const points = dailySeries(
      {
        range: { from: '2026-11-01', to: '2026-11-02' },
        rows: [{ ...day('2026-11-01', 900), orders: 3 }],
      },
      { range: { from: '2026-10-30', to: '2026-10-31' }, rows: [] },
    )
    const [first, second] = [points[0], points[1]] as [
      (typeof points)[number],
      (typeof points)[number],
    ]
    expect(first.averageTicketCents).toBe(300)
    expect(first.orders).toBe(3)
    expect(second.orders).toBe(0)
    expect(second.averageTicketCents).toBe(0)
  })
})

describe('topProfitProducts', () => {
  const product = (name: string, marginCents: number) => ({
    key: name,
    name,
    sku: name,
    unit: 'pz',
    orders: 1,
    units: 1,
    revenueCents: marginCents * 4,
    costCents: marginCents * 3,
    marginCents,
    marginBps: 2500,
  })

  test('keeps the most profitable products first, at most the limit', () => {
    const rows = [product('a', 10), product('b', 30), product('c', 20)]
    expect(topProfitProducts(rows, 2).map((row) => row.name)).toEqual([
      'b',
      'c',
    ])
  })

  test('leaves out products that lost money', () => {
    expect(
      topProfitProducts([product('a', 10), product('z', -5)], 10).map(
        (row) => row.name,
      ),
    ).toEqual(['a'])
  })
})

describe('supplierShares', () => {
  test('gives each supplier its share of the sales in basis points', () => {
    const shares = supplierShares([
      {
        key: '1',
        name: 'Lala',
        orders: 1,
        units: 1,
        revenueCents: 7500,
        costCents: 6000,
        marginCents: 1500,
        marginBps: 2000,
      },
      {
        key: '2',
        name: 'Alpura',
        orders: 1,
        units: 1,
        revenueCents: 2500,
        costCents: 2000,
        marginCents: 500,
        marginBps: 2000,
      },
    ])
    expect(shares.map((share) => share.shareBps)).toEqual([7500, 2500])
  })

  test('is empty without sales', () => {
    expect(supplierShares([])).toEqual([])
  })
})

describe('nonMovingBuckets', () => {
  const row = (daysSinceLastSale: number | null, valueCents: number) => ({
    daysSinceLastSale,
    valueCents,
  })

  test('groups idle stock by 30, 60 and 90+ days; never sold counts as 90+', () => {
    const buckets = nonMovingBuckets([
      row(31, 100),
      row(45, 50),
      row(61, 200),
      row(95, 300),
      row(null, 400),
    ])
    expect(buckets).toEqual([
      { key: '30', label: '30 días', valueCents: 150, products: 2 },
      { key: '60', label: '60 días', valueCents: 200, products: 1 },
      { key: '90', label: '90 o más', valueCents: 700, products: 2 },
    ])
  })
})

describe('cashDifferenceSummary', () => {
  const cut = (differenceCents: number | null, status = 'closed') =>
    ({
      sessionId: String(Math.random()),
      warehouseName: 'Tejupilco',
      status,
      differenceCents,
    }) as unknown as CashCutRow

  test('totals the difference of closed cuts and counts those that do not match', () => {
    const summary = cashDifferenceSummary([
      cut(-2000),
      cut(0),
      cut(500),
      cut(null, 'open'),
    ])
    expect(summary.closed).toBe(3)
    expect(summary.withDifference).toBe(2)
    expect(summary.totalCents).toBe(-1500)
  })
})

describe('stockAlertSummary', () => {
  const low = (warehouseName: string) =>
    ({ warehouseName }) as unknown as LowStockRow
  const lot = (expiresOn: string, valueCents: number) =>
    ({ expiresOn, valueCents }) as unknown as LotAlertRow

  test('counts low stock per warehouse and totals expiring lots', () => {
    const summary = stockAlertSummary({
      lowStock: [low('A'), low('B'), low('A')],
      expiring: [lot('2026-11-14', 100), lot('2026-11-12', 250)],
    })
    expect(summary.lowStockCount).toBe(3)
    expect(summary.lowStockByWarehouse).toEqual([
      { name: 'A', count: 2 },
      { name: 'B', count: 1 },
    ])
    expect(summary.expiringCount).toBe(2)
    expect(summary.expiringValueCents).toBe(350)
    expect(summary.nextExpiry).toBe('2026-11-12')
  })

  test('has no next expiry when nothing expires', () => {
    expect(
      stockAlertSummary({ lowStock: [], expiring: [] }).nextExpiry,
    ).toBeNull()
  })
})

describe('compactMoney and shortDay', () => {
  test('compactMoney shortens axis ticks to pesos, thousands and millions', () => {
    expect(compactMoney(0)).toBe('$0')
    expect(compactMoney(95_000)).toBe('$950')
    expect(compactMoney(2_500_000)).toBe('$25 mil')
    expect(compactMoney(150_000_000)).toBe('$1.5 M')
    expect(compactMoney(-2_500_000)).toBe('-$25 mil')
  })

  test('shortDay writes a business date as day and month', () => {
    expect(shortDay('2026-11-08')).toBe('8 nov')
    expect(shortDay('2026-01-31')).toBe('31 ene')
  })
})

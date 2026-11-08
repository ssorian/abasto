import { describe, expect, test } from 'bun:test'
import {
  cashDifferenceSeries,
  changeBps,
  dailySeries,
  previousRange,
  stockLevels,
  topByMargin,
} from '#/modules/reports/lib/manager-chart-data'
import type {
  CashCutRow,
  LowStockRow,
  ProductSalesRow,
  SalesRow,
} from '#/modules/reports/types/reports'

const day = (key: string, revenueCents: number): SalesRow => ({
  key,
  name: key,
  orders: 1,
  units: 1,
  revenueCents,
  costCents: 0,
  marginCents: revenueCents,
})

describe('previousRange', () => {
  test('is the same number of days right before the range', () => {
    expect(previousRange({ from: '2026-11-02', to: '2026-11-08' })).toEqual({
      from: '2026-10-26',
      to: '2026-11-01',
    })
    expect(previousRange({ from: '2026-11-08', to: '2026-11-08' })).toEqual({
      from: '2026-11-07',
      to: '2026-11-07',
    })
  })
})

describe('dailySeries', () => {
  const range = { from: '2026-11-02', to: '2026-11-04' }

  test('fills days without sales with zero and pairs the previous period by position', () => {
    const series = dailySeries(
      range,
      [day('2026-11-02', 500), day('2026-11-04', 900)],
      [day('2026-10-30', 300), day('2026-10-31', 100)],
    )
    expect(series.map((point) => point.date)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ])
    expect(series.map((point) => point.revenueCents)).toEqual([500, 0, 900])
    expect(series.map((point) => point.previousCents)).toEqual([300, 100, 0])
  })
})

describe('changeBps', () => {
  test('basis points of change, null without a previous figure', () => {
    expect(changeBps(1045, 1000)).toBe(450)
    expect(changeBps(900, 1000)).toBe(-1000)
    expect(changeBps(500, 0)).toBeNull()
  })
})

describe('topByMargin', () => {
  const product = (name: string, marginCents: number): ProductSalesRow => ({
    ...day(name, marginCents),
    sku: name,
    unit: 'pz',
  })

  test('orders by margin, keeps the first n, and scales bars to the best one', () => {
    const top = topByMargin(
      [product('a', 100), product('b', 400), product('c', 200)],
      2,
    )
    expect(top.map((row) => row.name)).toEqual(['b', 'c'])
    expect(top.map((row) => row.widthPercent)).toEqual([100, 50])
  })

  test('skips products without profit and handles an empty list', () => {
    expect(topByMargin([product('a', 0), product('b', -5)], 5)).toEqual([])
    expect(topByMargin([], 5)).toEqual([])
  })
})

describe('stockLevels', () => {
  const low = (name: string, available: number, minimum: number) =>
    ({ name, available, minimum }) as LowStockRow

  test('shows the share of the minimum, lowest first, red under a quarter', () => {
    const levels = stockLevels([
      low('a', 18, 60),
      low('b', 7, 30),
      low('c', 0, 10),
    ])
    expect(levels.map((row) => [row.name, row.percent, row.critical])).toEqual([
      ['c', 0, true],
      ['b', 23, true],
      ['a', 30, false],
    ])
  })
})

describe('cashDifferenceSeries', () => {
  const cut = (
    status: 'open' | 'closed',
    openedAt: string,
    differenceCents: number | null,
  ) => ({ status, openedAt: new Date(openedAt), differenceCents }) as CashCutRow

  test('charts closed cuts only, oldest first', () => {
    const series = cashDifferenceSeries([
      cut('closed', '2026-11-05T15:00:00Z', 45),
      cut('open', '2026-11-06T15:00:00Z', null),
      cut('closed', '2026-11-04T15:00:00Z', -40),
    ])
    expect(series.map((point) => point.differenceCents)).toEqual([-40, 45])
    expect(series.map((point) => point.date)).toEqual([
      '2026-11-04',
      '2026-11-05',
    ])
  })
})

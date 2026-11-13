import { describe, expect, test } from 'bun:test'
import { attentionOf } from '#/modules/overview/lib/attention'
import type {
  Overview,
  WarehouseOverview,
} from '#/modules/overview/types/overview'

const warehouse = (
  name: string,
  extra: Partial<WarehouseOverview> = {},
): WarehouseOverview => ({
  id: name,
  name,
  openOrders: 0,
  expiringTodayOrders: 0,
  pickedUpToday: 0,
  drawerOpen: true,
  belowMinimum: 0,
  expiringLots: 0,
  ...extra,
})

const overviewOf = (warehouses: Array<WarehouseOverview>): Overview => ({
  today: '2026-11-12',
  warehouses,
  totals: {
    openOrders: 0,
    expiringTodayOrders: 0,
    pickedUpToday: 0,
    drawersOpen: 0,
    belowMinimum: 0,
    expiringLots: 0,
  },
  lowStock: [],
  expiring: [],
  expired: [],
})

describe('attentionOf', () => {
  test('nothing needs attention when drawers are open and no order expires today', () => {
    const attention = attentionOf(overviewOf([warehouse('Centro')]))
    expect(attention.closedDrawers).toEqual([])
    expect(attention.ordersExpiringToday).toEqual([])
    expect(attention.isEmpty).toBe(true)
  })

  test('only closed drawers and warehouses with orders expiring today are listed', () => {
    const attention = attentionOf(
      overviewOf([
        warehouse('Centro', { expiringTodayOrders: 2 }),
        warehouse('Norte', { drawerOpen: false }),
        warehouse('Sur'),
      ]),
    )
    expect(attention.closedDrawers.map((item) => item.name)).toEqual(['Norte'])
    expect(attention.ordersExpiringToday.map((item) => item.name)).toEqual([
      'Centro',
    ])
    expect(attention.isEmpty).toBe(false)
  })

  test('per-warehouse activity hides warehouses with nothing today', () => {
    const attention = attentionOf(
      overviewOf([
        warehouse('Centro', { openOrders: 1 }),
        warehouse('Norte', { salesCents: 0, marginCents: 0 }),
        warehouse('Sur', { pickedUpToday: 1, salesCents: 500 }),
      ]),
    )
    expect(attention.activeWarehouses.map((item) => item.name)).toEqual([
      'Centro',
      'Sur',
    ])
  })
})

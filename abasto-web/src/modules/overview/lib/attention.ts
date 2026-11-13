import type {
  Overview,
  WarehouseOverview,
} from '#/modules/overview/types/overview'

export type Attention = {
  closedDrawers: Array<WarehouseOverview>
  ordersExpiringToday: Array<WarehouseOverview>
  /** Warehouses with open orders, deliveries or sales today. */
  activeWarehouses: Array<WarehouseOverview>
  isEmpty: boolean
}

/** What Inicio puts first: only the rows that ask for someone to act. */
export function attentionOf(overview: Overview): Attention {
  const { warehouses } = overview
  const closedDrawers = warehouses.filter((item) => !item.drawerOpen)
  const ordersExpiringToday = warehouses.filter(
    (item) => item.expiringTodayOrders > 0,
  )
  const activeWarehouses = warehouses.filter(
    (item) =>
      item.openOrders > 0 ||
      item.pickedUpToday > 0 ||
      (item.salesCents ?? 0) > 0,
  )
  return {
    closedDrawers,
    ordersExpiringToday,
    activeWarehouses,
    isEmpty:
      closedDrawers.length === 0 &&
      ordersExpiringToday.length === 0 &&
      overview.expired.length === 0 &&
      overview.expiring.length === 0 &&
      overview.lowStock.length === 0,
  }
}

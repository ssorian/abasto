import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import {
  businessDate,
  businessTimeZone,
  now,
} from '#/modules/orders/services/clock'
import type {
  ExpiringItem,
  LowStockItem,
  Overview,
  OverviewTotals,
  WarehouseOverview,
} from '#/modules/overview/types/overview'
import { addDays } from '#/modules/reports/lib/period'
import { uuidList } from '#/modules/reports/services/report-scope'
import { getSalesReport } from '#/modules/reports/services/sales-report'
import {
  queryExpiredLots,
  queryExpiringLots,
  queryLowStock,
} from '#/modules/reports/services/stock-alerts'
import type { LotAlertRow } from '#/modules/reports/types/reports'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

const EXPIRING_DAYS = 7
const LIST_SIZE = 5

type Counts = {
  warehouse_id: string
  open_orders: number
  expiring_today: number
  picked_up_today: number
  drawer_open: boolean
}

/** Per-warehouse order and drawer counts for the business day `today`. */
async function operationalCounts(
  warehouseIds: ReadonlyArray<string>,
  today: string,
) {
  const at = sql`(${now().toISOString()}::timestamptz at time zone 'UTC')`
  const day = (column: ReturnType<typeof sql.raw>) =>
    sql`((${column} at time zone 'UTC') at time zone ${businessTimeZone})::date`
  const result = await db.execute<Counts>(sql`
    select w.id as warehouse_id,
      (select count(*)::int from orders o
        where o.warehouse_id = w.id and o.status in ('Reservado', 'Preparado')
          and o.expires_at > ${at}) as open_orders,
      (select count(*)::int from orders o
        where o.warehouse_id = w.id and o.status in ('Reservado', 'Preparado')
          and o.expires_at > ${at}
          and ${day(sql.raw('o.expires_at'))} = ${today}::date) as expiring_today,
      (select count(*)::int from orders o
        where o.warehouse_id = w.id and o.status = 'Recogido'
          and ${day(sql.raw('o.closed_at'))} = ${today}::date) as picked_up_today,
      exists (select 1 from cash_sessions s
        where s.warehouse_id = w.id and s.status = 'open') as drawer_open
    from warehouses w
    where w.id in (${uuidList(warehouseIds)})`)
  return new Map(result.rows.map((row) => [row.warehouse_id, row]))
}

const lotItem = (row: LotAlertRow): ExpiringItem => ({
  lotId: row.lotId,
  warehouseId: row.warehouseId,
  productId: row.productId,
  warehouseName: row.warehouseName,
  name: row.name,
  unit: row.unit,
  lotCode: row.lotCode,
  expiresOn: row.expiresOn,
  daysLeft: row.daysLeft,
  onHand: row.onHand,
})

const countBy = (rows: ReadonlyArray<{ warehouseId: string }>, id: string) =>
  rows.filter((row) => row.warehouseId === id).length

/**
 * Inicio for the warehouses the actor sees (the owner: all). Everyone gets
 * the operational counts; sales and margin of today come only for the
 * warehouses the actor manages.
 */
export async function getOverview(actor: Actor): Promise<Overview> {
  const today = businessDate()
  const visible = (await listWarehouses(actor)).filter(({ id }) =>
    can(actor, 'warehouse.view', id),
  )
  const ids = visible.map((item) => item.id)
  const managed = visible.filter(({ id }) => can(actor, 'warehouse.manage', id))
  const [counts, lowStockRows, expiringRows, expiredRows, sales] =
    await Promise.all([
      operationalCounts(ids, today),
      queryLowStock(actor, visible),
      queryExpiringLots(ids, {
        from: today,
        to: addDays(today, EXPIRING_DAYS),
      }),
      queryExpiredLots(ids, today),
      managed.length
        ? getSalesReport(actor, {
            period: { preset: 'today' },
            warehouseIds: managed.map((item) => item.id),
          })
        : null,
    ])

  const warehouses = visible.map((item): WarehouseOverview => {
    const row = counts.get(item.id)
    const money = sales?.byWarehouse.find((entry) => entry.key === item.id)
    return {
      id: item.id,
      name: item.name,
      openOrders: row?.open_orders ?? 0,
      expiringTodayOrders: row?.expiring_today ?? 0,
      pickedUpToday: row?.picked_up_today ?? 0,
      drawerOpen: row?.drawer_open ?? false,
      belowMinimum: countBy(lowStockRows, item.id),
      expiringLots: countBy(expiringRows, item.id),
      ...(managed.some(({ id }) => id === item.id)
        ? {
            salesCents: money?.revenueCents ?? 0,
            marginCents: money?.marginCents ?? 0,
          }
        : {}),
    }
  })
  const sum = (pick: (item: WarehouseOverview) => number) =>
    warehouses.reduce((total, item) => total + pick(item), 0)
  const totals: OverviewTotals = {
    openOrders: sum((item) => item.openOrders),
    expiringTodayOrders: sum((item) => item.expiringTodayOrders),
    pickedUpToday: sum((item) => item.pickedUpToday),
    drawersOpen: sum((item) => (item.drawerOpen ? 1 : 0)),
    belowMinimum: sum((item) => item.belowMinimum),
    expiringLots: sum((item) => item.expiringLots),
    ...(sales
      ? {
          salesCents: sales.summary.revenueCents,
          marginCents: sales.summary.marginCents,
        }
      : {}),
  }
  const lowStock = lowStockRows
    .slice(0, LIST_SIZE)
    .map((row): LowStockItem => ({
      warehouseId: row.warehouseId,
      productId: row.productId,
      warehouseName: row.warehouseName,
      name: row.name,
      unit: row.unit,
      available: row.available,
      minimum: row.minimum,
    }))
  return {
    today,
    warehouses,
    totals,
    lowStock,
    expiring: expiringRows.slice(0, LIST_SIZE).map(lotItem),
    expired: expiredRows.slice(0, LIST_SIZE).map(lotItem),
  }
}

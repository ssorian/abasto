import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import { businessDate } from '#/modules/orders/services/clock'
import { addDays } from '#/modules/reports/lib/period'
import {
  reportWarehouses,
  uuidList,
} from '#/modules/reports/services/report-scope'
import type {
  LotAlertRow,
  LowStockRow,
  ReportWarehouse,
  StockAlerts,
} from '#/modules/reports/types/reports'

export const DEFAULT_EXPIRING_DAYS = 7
const MAX_EXPIRING_DAYS = 365

type LotRaw = {
  lot_id: string
  warehouse_id: string
  warehouse_name: string
  product_id: string
  name: string
  sku: string
  unit: string
  code: string
  expires_on: string
  days_left: number
  on_hand: number
  reserved: number
  value: string
}

/** Lots with stock expiring on `from`..`to` (business dates), soonest first. */
export async function queryExpiringLots(
  warehouseIds: ReadonlyArray<string>,
  window: { from?: string; to?: string },
  today = businessDate(),
): Promise<Array<LotAlertRow>> {
  const lower = window.from
    ? sql`and l.expires_on >= ${window.from}::date`
    : sql``
  const upper = window.to ? sql`and l.expires_on <= ${window.to}::date` : sql``
  const result = await db.execute<LotRaw>(sql`
    select l.id as lot_id, l.warehouse_id, w.name as warehouse_name,
      p.id as product_id, p.name, p.sku, p.unit, l.code,
      l.expires_on::text as expires_on,
      (l.expires_on - ${today}::date) as days_left,
      l.on_hand, l.reserved,
      round(l.on_hand::numeric * l.received_cost_cents / l.received_quantity)::bigint as value
    from lots l
    join warehouses w on w.id = l.warehouse_id
    join products p on p.id = l.product_id
    where l.warehouse_id in (${uuidList(warehouseIds)})
      and l.on_hand > 0 and l.expires_on is not null
      ${lower} ${upper}
    order by l.expires_on, w.name, p.name, l.id`)
  return result.rows.map((row) => ({
    lotId: row.lot_id,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse_name,
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    unit: row.unit,
    lotCode: row.code,
    expiresOn: row.expires_on,
    daysLeft: row.days_left,
    onHand: row.on_hand,
    reserved: row.reserved,
    valueCents: Number(row.value),
  }))
}

/** Lots with stock whose expiry day is before `today`. */
export const queryExpiredLots = (
  warehouseIds: ReadonlyArray<string>,
  today = businessDate(),
) => queryExpiringLots(warehouseIds, { to: addDays(today, -1) }, today)

/** Products below their minimum (available-based) in the given warehouses. */
export async function queryLowStock(
  actor: Actor,
  warehouses: ReadonlyArray<ReportWarehouse>,
): Promise<Array<LowStockRow>> {
  const rows: Array<LowStockRow> = []
  // One at a time: each read takes its warehouse's stock lock to expire orders.
  for (const warehouse of warehouses) {
    for (const item of await getWarehouseStock(actor, warehouse.id)) {
      if (!item.belowMinimum) continue
      rows.push({
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        available: item.available,
        minimum: item.minimum,
        missing: item.minimum - item.available,
      })
    }
  }
  return rows.sort(
    (a, b) =>
      a.warehouseName.localeCompare(b.warehouseName) ||
      a.name.localeCompare(b.name),
  )
}

/**
 * Stock to act on in the warehouses the actor manages: products below their
 * minimum, lots expiring within `expiringDays` (default 7) and units already
 * expired, valued at each lot's own cost.
 */
export async function getStockAlerts(
  actor: Actor,
  input: { warehouseIds?: ReadonlyArray<string>; expiringDays?: number },
): Promise<StockAlerts> {
  const expiringDays = input.expiringDays ?? DEFAULT_EXPIRING_DAYS
  if (
    !Number.isInteger(expiringDays) ||
    expiringDays < 1 ||
    expiringDays > MAX_EXPIRING_DAYS
  ) {
    throw new AppError(
      'invalid',
      `Los días por vencer deben ser un número entero entre 1 y ${MAX_EXPIRING_DAYS}.`,
    )
  }
  const warehouses = await reportWarehouses(actor, input.warehouseIds)
  const ids = warehouses.map((item) => item.id)
  const today = businessDate()
  const [lowStock, expiring, expired] = await Promise.all([
    queryLowStock(actor, warehouses),
    queryExpiringLots(ids, { from: today, to: addDays(today, expiringDays) }),
    queryExpiredLots(ids),
  ])
  return { warehouses, expiringDays, lowStock, expiring, expired }
}

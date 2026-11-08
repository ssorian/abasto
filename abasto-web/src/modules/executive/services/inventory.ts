import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import type {
  InventoryValue,
  NonMovingCapital,
  NonMovingDays,
  NonMovingRow,
} from '#/modules/executive/types/inventory'
import { NON_MOVING_DAYS } from '#/modules/executive/types/inventory'
import { businessDate } from '#/modules/orders/services/clock'
import {
  localDay,
  reportWarehouses,
  requireOwner,
  uuidList,
} from '#/modules/reports/services/report-scope'
import type { ExecutiveFilters } from '#/modules/executive/services/profitability'
import { lotValueCents } from '#/modules/reports/services/stock-alerts'

export const DEFAULT_NON_MOVING_DAYS: NonMovingDays = 30

/** Owner-only: the whole business, or the requested warehouses (each validated). */
async function ownerWarehouses(
  actor: Actor,
  requested?: ReadonlyArray<string>,
) {
  requireOwner(actor)
  return reportWarehouses(actor, requested)
}

/** Lots of one supplier's products; compared as text so a malformed id matches nothing. */
const ofSupplier = (supplierId?: string) =>
  supplierId
    ? sql`and exists (
        select 1 from products sp
        where sp.id = l.product_id and sp.supplier_id::text = ${supplierId})`
    : sql``

/** Inventory at cost per warehouse (lots with stock only) and in total. */
export async function getInventoryValue(
  actor: Actor,
  input: ExecutiveFilters = {},
): Promise<InventoryValue> {
  const warehouses = await ownerWarehouses(actor, input.warehouseIds)
  const result = await db.execute<{
    warehouse_id: string
    units: string
    value: string
  }>(sql`
    select l.warehouse_id, sum(l.on_hand)::bigint as units,
      sum(${lotValueCents})::bigint as value
    from lots l
    where l.warehouse_id in (${uuidList(warehouses.map((item) => item.id))})
      and l.on_hand > 0
      ${ofSupplier(input.supplierId)}
    group by l.warehouse_id`)
  const byWarehouse = new Map(result.rows.map((row) => [row.warehouse_id, row]))
  const rows = warehouses.map((warehouse) => {
    const row = byWarehouse.get(warehouse.id)
    return {
      ...warehouse,
      units: Number(row?.units ?? 0),
      valueCents: Number(row?.value ?? 0),
    }
  })
  return {
    warehouses: rows,
    totalCents: rows.reduce((sum, row) => sum + row.valueCents, 0),
  }
}

type NonMovingRaw = {
  warehouse_id: string
  warehouse_name: string
  product_id: string
  name: string
  sku: string
  unit: string
  on_hand: string
  value: string
  last_sale_on: string | null
  days_since: number | null
}

/**
 * Stock valued at cost with no sale in the last `days` business days (default
 * 30; only 30, 60 or 90). A sale `days` days ago still counts as inside the
 * window. "Sale" = a picked-up order line (`orders.status = 'Recogido'` at
 * `closed_at`), the same source as the sales report: stock movements are
 * stamped with the database clock, which the business clock cannot drive.
 * Sorted by value, highest first.
 */
export async function getNonMovingCapital(
  actor: Actor,
  input: { days?: number } & ExecutiveFilters = {},
): Promise<NonMovingCapital> {
  const warehouses = await ownerWarehouses(actor, input.warehouseIds)
  const days = input.days ?? DEFAULT_NON_MOVING_DAYS
  if (!NON_MOVING_DAYS.some((allowed) => allowed === days)) {
    throw new AppError('invalid', 'Los días sin venta deben ser 30, 60 o 90.')
  }
  const today = businessDate()
  const result = await db.execute<NonMovingRaw>(sql`
    with stock as (
      select l.warehouse_id, l.product_id, sum(l.on_hand)::bigint as on_hand,
        sum(${lotValueCents})::bigint as value
      from lots l
      where l.warehouse_id in (${uuidList(warehouses.map((item) => item.id))})
        and l.on_hand > 0
        ${ofSupplier(input.supplierId)}
      group by l.warehouse_id, l.product_id
    ), last_sale as (
      select o.warehouse_id, ol.product_id,
        max(${localDay(sql`o.closed_at`)}) as day
      from orders o
      join order_lines ol on ol.order_id = o.id
      where o.status = 'Recogido'
      group by o.warehouse_id, ol.product_id
    )
    select s.warehouse_id, w.name as warehouse_name, p.id as product_id,
      p.name, p.sku, p.unit, s.on_hand, s.value,
      ls.day::text as last_sale_on,
      (${today}::date - ls.day) as days_since
    from stock s
    join warehouses w on w.id = s.warehouse_id
    join products p on p.id = s.product_id
    left join last_sale ls
      on ls.warehouse_id = s.warehouse_id and ls.product_id = s.product_id
    where ls.day is null or (${today}::date - ls.day) > ${days}
    order by s.value desc, w.name, p.name, p.id`)
  const rows: Array<NonMovingRow> = result.rows.map((row) => ({
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse_name,
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    unit: row.unit,
    onHand: Number(row.on_hand),
    valueCents: Number(row.value),
    lastSaleOn: row.last_sale_on,
    daysSinceLastSale: row.days_since,
  }))
  return {
    days: days as NonMovingDays,
    rows,
    totalCents: rows.reduce((sum, row) => sum + row.valueCents, 0),
  }
}

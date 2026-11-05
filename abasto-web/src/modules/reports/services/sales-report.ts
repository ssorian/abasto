import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '#/db'
import type { Actor } from '#/modules/access/lib/policy'
import {
  inRange,
  localDay,
  periodRange,
  reportWarehouses,
  uuidList,
} from '#/modules/reports/services/report-scope'
import type {
  DateRange,
  PeriodInput,
  ProductSalesRow,
  SalesReport,
  SalesRow,
  SalesTotals,
} from '#/modules/reports/types/reports'

type RawRow = {
  key: string
  name: string
  sku?: string
  unit?: string
  orders: number
  units: string
  revenue: string
  cost: string
}

const totalsOf = (row: RawRow): SalesTotals => {
  const revenueCents = Number(row.revenue)
  const costCents = Number(row.cost)
  return {
    orders: row.orders,
    units: Number(row.units),
    revenueCents,
    costCents,
    marginCents: revenueCents - costCents,
  }
}

/**
 * One row per order line of the picked-up orders in range, with the line's
 * cost: Σ allocated base units × the lot's own unit cost
 * (received cost ÷ received quantity), kept as an exact fraction. Rows of any
 * grouping sum these fractions and round once.
 */
function pickedUpLines(range: DateRange, warehouseIds: ReadonlyArray<string>) {
  return sql`
    select o.id as order_id, o.warehouse_id, o.customer_id, o.closed_at,
      ol.product_id, ol.line_total_cents, ol.base_quantity,
      coalesce((
        select sum(oa.quantity::numeric * l.received_cost_cents / l.received_quantity)
        from order_allocations oa
        join lots l on l.id = oa.lot_id
        where oa.order_line_id = ol.id
      ), 0) as cost
    from orders o
    join order_lines ol on ol.order_id = o.id
    where o.status = 'Recogido'
      and o.warehouse_id in (${uuidList(warehouseIds)})
      and ${inRange(sql`o.closed_at`, range)}`
}

const aggregates = sql`
  count(distinct s.order_id)::int as orders,
  sum(s.base_quantity)::bigint as units,
  sum(s.line_total_cents)::bigint as revenue,
  round(sum(s.cost))::bigint as cost`

const groupings = {
  day: {
    select: sql`to_char(${localDay(sql`s.closed_at`)}, 'YYYY-MM-DD') as key,
      to_char(${localDay(sql`s.closed_at`)}, 'YYYY-MM-DD') as name`,
    from: sql`lines s`,
    groupBy: sql`1, 2`,
    orderBy: sql`1`,
  },
  product: {
    select: sql`p.id::text as key, p.name as name, p.sku as sku, p.unit as unit`,
    from: sql`lines s join products p on p.id = s.product_id`,
    groupBy: sql`p.id, p.name, p.sku, p.unit`,
    orderBy: sql`sum(s.line_total_cents) desc, p.name`,
  },
  customer: {
    select: sql`c.id::text as key, c.name as name`,
    from: sql`lines s join customers c on c.id = s.customer_id`,
    groupBy: sql`c.id, c.name`,
    orderBy: sql`sum(s.line_total_cents) desc, c.name`,
  },
  warehouse: {
    select: sql`w.id::text as key, w.name as name`,
    from: sql`lines s join warehouses w on w.id = s.warehouse_id`,
    groupBy: sql`w.id, w.name`,
    orderBy: sql`w.name`,
  },
} satisfies Record<string, Record<string, SQL>>

async function grouped(
  dimension: keyof typeof groupings,
  range: DateRange,
  warehouseIds: ReadonlyArray<string>,
): Promise<Array<RawRow>> {
  const g = groupings[dimension]
  const result = await db.execute<RawRow>(sql`
    with lines as (${pickedUpLines(range, warehouseIds)})
    select ${g.select}, ${aggregates}
    from ${g.from}
    group by ${g.groupBy}
    order by ${g.orderBy}`)
  return result.rows
}

async function summary(
  range: DateRange,
  warehouseIds: ReadonlyArray<string>,
): Promise<SalesTotals> {
  const result = await db.execute<RawRow>(sql`
    with lines as (${pickedUpLines(range, warehouseIds)})
    select ${aggregates} from lines s`)
  const row = result.rows[0]
  return row.orders
    ? totalsOf(row)
    : { orders: 0, units: 0, revenueCents: 0, costCents: 0, marginCents: 0 }
}

const asRow = (row: RawRow): SalesRow => ({
  key: row.key,
  name: row.name,
  ...totalsOf(row),
})

/**
 * Sales and margin of the picked-up orders in the period (business days in
 * Mexico City), for the warehouses the actor manages. Revenue is the frozen
 * line totals; cancelled, expired and open orders are not sales.
 */
export async function getSalesReport(
  actor: Actor,
  input: { period: PeriodInput; warehouseIds?: ReadonlyArray<string> },
): Promise<SalesReport> {
  const warehouses = await reportWarehouses(actor, input.warehouseIds)
  const range = periodRange(input.period)
  const ids = warehouses.map((item) => item.id)
  const [total, byDay, byProduct, byCustomer, byWarehouse] = await Promise.all([
    summary(range, ids),
    grouped('day', range, ids),
    grouped('product', range, ids),
    grouped('customer', range, ids),
    grouped('warehouse', range, ids),
  ])
  return {
    range,
    warehouses,
    summary: total,
    byDay: byDay.map(asRow),
    byProduct: byProduct.map((row): ProductSalesRow => ({
      ...asRow(row),
      sku: row.sku ?? '',
      unit: row.unit ?? '',
    })),
    byCustomer: byCustomer.map(asRow),
    byWarehouse: byWarehouse.map(asRow),
  }
}

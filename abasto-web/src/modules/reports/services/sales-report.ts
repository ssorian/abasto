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
 * Settled rider deliveries, one row per allocation that sold something. A
 * delivery counts as one ticket (`order_id` is the assignment id) on the day
 * it was settled, valued like the settlement itself (`priceSold`): sold units
 * come from the oldest allocation first; the first floor(sold ÷ box) × box
 * units are whole boxes at the frozen box price, the rest loose pieces at the
 * frozen piece price (or the prorated box price without one), half-up rounded.
 */
function settledRiderLines(
  range: DateRange,
  warehouseIds: ReadonlyArray<string>,
  supplierId?: string,
) {
  const supplier = supplierId
    ? sql`and exists (
        select 1 from products sp
        where sp.id = ln.product_id and sp.supplier_id::text = ${supplierId})`
    : sql``
  return sql`
    select a.id as order_id, a.warehouse_id, null::uuid as customer_id,
      a.closed_at, 'Reparto' as channel, ln.product_id,
      (case
        when ra.piece_cents is null
          then (2 * ra.sold_quantity::bigint * ra.price_cents + ra.price_factor)
            / (2 * ra.price_factor)
        else (2 * ra.in_boxes::bigint * ra.price_cents + ra.price_factor)
            / (2 * ra.price_factor)
          + (ra.sold_quantity - ra.in_boxes)::bigint * ra.piece_cents
      end)::bigint as line_total_cents,
      ra.sold_quantity as base_quantity,
      ra.sold_quantity::numeric * ra.lot_cost as cost
    from rider_assignments a
    join rider_assignment_lines ln on ln.assignment_id = a.id
    join (
      select r.*, l.received_cost_cents::numeric / l.received_quantity as lot_cost,
        least(r.sold_quantity, greatest(0,
          ((sum(r.sold_quantity) over line_window)::int
            / first_value(r.price_factor) over lot_order)
            * first_value(r.price_factor) over lot_order
          - coalesce(sum(r.sold_quantity) over (
              partition by r.line_id order by l.received_at, l.id
              rows between unbounded preceding and 1 preceding), 0)
        )) as in_boxes
      from rider_allocations r
      join lots l on l.id = r.lot_id
      window line_window as (partition by r.line_id),
        lot_order as (partition by r.line_id order by l.received_at, l.id)
    ) ra on ra.line_id = ln.id
    where a.status = 'Liquidada'
      and ra.sold_quantity > 0
      and a.warehouse_id in (${uuidList(warehouseIds)})
      and ${inRange(sql`a.closed_at`, range)}
      ${supplier}`
}

/**
 * One row per sold order line with the line's cost: Σ allocated base units ×
 * the lot's own unit cost (received cost ÷ received quantity), kept as an
 * exact fraction. Rows of any grouping sum these fractions and round once.
 * Sales are the picked-up counter and store orders plus settled rider
 * deliveries ("Reparto"), the same sales the cash box counts.
 */
export function pickedUpLines(
  range: DateRange,
  warehouseIds: ReadonlyArray<string>,
  supplierId?: string,
) {
  // Compared as text so a malformed id matches nothing instead of failing the cast.
  const supplier = supplierId
    ? sql`and exists (
        select 1 from products sp
        where sp.id = ol.product_id and sp.supplier_id::text = ${supplierId})`
    : sql``
  return sql`
    select o.id as order_id, o.warehouse_id, o.customer_id, o.closed_at,
      case o.source when 'counter' then 'Mostrador' else 'Tienda' end as channel,
      ol.product_id, ol.line_total_cents::bigint as line_total_cents, ol.base_quantity,
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
      and ${inRange(sql`o.closed_at`, range)}
      ${supplier}
    union all
    ${settledRiderLines(range, warehouseIds, supplierId)}`
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
  channel: {
    select: sql`s.channel as key, s.channel as name`,
    from: sql`lines s`,
    groupBy: sql`1, 2`,
    orderBy: sql`array_position(array['Mostrador', 'Tienda', 'Reparto'], s.channel)`,
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
  supplierId?: string,
): Promise<Array<RawRow>> {
  const g = groupings[dimension]
  const result = await db.execute<RawRow>(sql`
    with lines as (${pickedUpLines(range, warehouseIds, supplierId)})
    select ${g.select}, ${aggregates}
    from ${g.from}
    group by ${g.groupBy}
    order by ${g.orderBy}`)
  return result.rows
}

async function summary(
  range: DateRange,
  warehouseIds: ReadonlyArray<string>,
  supplierId?: string,
): Promise<SalesTotals> {
  const result = await db.execute<RawRow>(sql`
    with lines as (${pickedUpLines(range, warehouseIds, supplierId)})
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
 * Sales and margin of the picked-up orders and settled deliveries in the period (business days in
 * Mexico City), for the warehouses the actor manages. Revenue is the frozen
 * line totals; cancelled, expired and open orders are not sales.
 */
export async function getSalesReport(
  actor: Actor,
  input: {
    period: PeriodInput
    warehouseIds?: ReadonlyArray<string>
    supplierId?: string
  },
): Promise<SalesReport> {
  const warehouses = await reportWarehouses(actor, input.warehouseIds)
  const range = periodRange(input.period)
  const ids = warehouses.map((item) => item.id)
  const [total, byDay, byProduct, byCustomer, byChannel, byWarehouse] =
    await Promise.all([
      summary(range, ids, input.supplierId),
      grouped('day', range, ids, input.supplierId),
      grouped('product', range, ids, input.supplierId),
      grouped('customer', range, ids, input.supplierId),
      grouped('channel', range, ids, input.supplierId),
      grouped('warehouse', range, ids, input.supplierId),
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
    byChannel: byChannel.map(asRow),
    byWarehouse: byWarehouse.map(asRow),
  }
}

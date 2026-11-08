import { sql } from 'drizzle-orm'
import { db } from '#/db'
import type { Actor } from '#/modules/access/lib/policy'
import {
  deltaOf,
  marginBps,
  metricsOf,
  previousRange,
} from '#/modules/executive/lib/profitability'
import type {
  MarginReport,
  MarginRow,
  MarginTotals,
  WarehouseMetrics,
  WarehouseRanking,
} from '#/modules/executive/types/profitability'
import {
  periodRange,
  reportWarehouses,
  requireOwner,
} from '#/modules/reports/services/report-scope'
import { pickedUpLines } from '#/modules/reports/services/sales-report'
import type { DateRange, PeriodInput } from '#/modules/reports/types/reports'

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

const NO_SUPPLIER = 'Sin proveedor'

const totalsOf = (row: RawRow): MarginTotals => {
  const revenueCents = Number(row.revenue)
  const costCents = Number(row.cost)
  const marginCents = revenueCents - costCents
  return {
    orders: row.orders,
    units: Number(row.units),
    revenueCents,
    costCents,
    marginCents,
    marginBps: marginBps(marginCents, revenueCents),
  }
}

const asRow = (row: RawRow): MarginRow => ({
  key: row.key,
  name: row.name,
  ...totalsOf(row),
})

const aggregates = sql`
  count(distinct s.order_id)::int as orders,
  coalesce(sum(s.base_quantity), 0)::bigint as units,
  coalesce(sum(s.line_total_cents), 0)::bigint as revenue,
  coalesce(round(sum(s.cost)), 0)::bigint as cost`

const groupings = {
  product: {
    select: sql`p.id::text as key, p.name as name, p.sku as sku, p.unit as unit`,
    from: sql`lines s join products p on p.id = s.product_id`,
    groupBy: sql`p.id, p.name, p.sku, p.unit`,
    orderBy: sql`sum(s.line_total_cents) desc, p.name`,
  },
  supplier: {
    select: sql`coalesce(p.supplier_id::text, 'none') as key,
      coalesce(su.name, ${NO_SUPPLIER}) as name`,
    from: sql`lines s join products p on p.id = s.product_id
      left join suppliers su on su.id = p.supplier_id`,
    groupBy: sql`p.supplier_id, su.name`,
    orderBy: sql`sum(s.line_total_cents) desc, 2`,
  },
  warehouse: {
    select: sql`w.id::text as key, w.name as name`,
    from: sql`lines s join warehouses w on w.id = s.warehouse_id`,
    groupBy: sql`w.id, w.name`,
    orderBy: sql`sum(s.line_total_cents) desc, w.name`,
  },
}

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
): Promise<MarginTotals> {
  const result = await db.execute<RawRow>(sql`
    with lines as (${pickedUpLines(range, warehouseIds)})
    select ${aggregates} from lines s`)
  return totalsOf(result.rows[0])
}

/**
 * Gross margin of the picked-up orders in the period over every warehouse,
 * by product, supplier (no supplier = "Sin proveedor") and warehouse. Owner
 * only. Revenue and cost come from the sales report's own line query.
 */
export async function getMarginReport(
  actor: Actor,
  input: { period: PeriodInput },
): Promise<MarginReport> {
  requireOwner(actor)
  const warehouses = await reportWarehouses(actor)
  const range = periodRange(input.period)
  const ids = warehouses.map((item) => item.id)
  const [total, byProduct, bySupplier, byWarehouse] = await Promise.all([
    summary(range, ids),
    grouped('product', range, ids),
    grouped('supplier', range, ids),
    grouped('warehouse', range, ids),
  ])
  const sold = new Map(byWarehouse.map((row) => [row.key, asRow(row)]))
  return {
    range,
    warehouses,
    summary: total,
    byProduct: byProduct.map((row) => ({
      ...asRow(row),
      sku: row.sku ?? '',
      unit: row.unit ?? '',
    })),
    bySupplier: bySupplier.map(asRow),
    // Warehouses without sales stay in the list, with zeros.
    byWarehouse: warehouses
      .map(
        (w) =>
          sold.get(w.id) ?? {
            key: w.id,
            name: w.name,
            ...totalsOf({
              key: w.id,
              name: w.name,
              orders: 0,
              units: '0',
              revenue: '0',
              cost: '0',
            }),
          },
      )
      .sort(
        (a, b) =>
          b.revenueCents - a.revenueCents || a.name.localeCompare(b.name),
      ),
  }
}

async function metricsByWarehouse(
  range: DateRange,
  ids: ReadonlyArray<string>,
): Promise<Map<string, WarehouseMetrics>> {
  const rows = await grouped('warehouse', range, ids)
  return new Map(
    rows.map((row) => [
      row.key,
      metricsOf(Number(row.revenue), Number(row.cost), row.orders),
    ]),
  )
}

/**
 * Every warehouse side by side for the period and for the period of equal
 * length right before it, with the change. Owner only; warehouses without
 * sales are included with zeros.
 */
export async function getWarehouseRanking(
  actor: Actor,
  input: { period: PeriodInput },
): Promise<WarehouseRanking> {
  requireOwner(actor)
  const warehouses = await reportWarehouses(actor)
  const range = periodRange(input.period)
  const previous = previousRange(range)
  const ids = warehouses.map((item) => item.id)
  const [now, before] = await Promise.all([
    metricsByWarehouse(range, ids),
    metricsByWarehouse(previous, ids),
  ])
  const rows = warehouses.map((w) => {
    const current = now.get(w.id) ?? metricsOf(0, 0, 0)
    const prior = before.get(w.id) ?? metricsOf(0, 0, 0)
    return {
      key: w.id,
      name: w.name,
      current,
      previous: prior,
      delta: deltaOf(current, prior),
    }
  })
  rows.sort(
    (a, b) =>
      b.current.revenueCents - a.current.revenueCents ||
      a.name.localeCompare(b.name),
  )
  return { range, previousRange: previous, rows }
}

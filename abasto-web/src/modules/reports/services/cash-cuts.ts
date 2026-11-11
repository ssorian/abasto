import { sql } from 'drizzle-orm'
import { db } from '#/db'
import type { Actor } from '#/modules/access/lib/policy'
import {
  inRange,
  periodRange,
  reportWarehouses,
  uuidList,
} from '#/modules/reports/services/report-scope'
import type {
  CashCutRow,
  CashCuts,
  DateRange,
  PeriodInput,
  RiderShortfallRow,
} from '#/modules/reports/types/reports'

type RawRow = {
  session_id: string
  warehouse_id: string
  warehouse_name: string
  status: 'open' | 'closed'
  /** `timestamp` columns arrive as zone-less UTC text ("2026-11-11 04:27:00"). */
  opened_at: Date | string
  closed_at: Date | string | null
  opened_by: string
  closed_by: string | null
  opening_cents: number
  sales: string
  entries: string
  withdrawals: string
  rider_differences: string
  counted_cents: number | null
  stored_expected: number | null
}

/** Revives a zone-less UTC timestamp; `new Date(text)` would read it in the server zone. */
function utcDate(value: Date | string): Date {
  if (value instanceof Date) return value
  return new Date(
    `${value.replace(' ', 'T')}${/[zZ]|[+-]\d\d(:?\d\d)?$/.test(value) ? '' : 'Z'}`,
  )
}

/**
 * Cash cut of every drawer session closed in the period, or opened in it when
 * still open (business days in Mexico City): expected cash, counted cash and the difference. An open
 * session shows its running expected cash and no count yet.
 *
 * Rider deliveries post the sale at the sold value plus a separate signed
 * `rider_difference` movement. The difference gets its own column
 * (`riderDifferenceCents`) instead of being folded into sales, entries or
 * withdrawals: sales stay equal to the Reports sales, and expected cash =
 * opening + sales + entries + riderDifference − withdrawals is unchanged.
 * `riderShortfalls` adds the net shortage by rider for the same period and warehouses.
 */
export async function getCashCuts(
  actor: Actor,
  input: { period: PeriodInput; warehouseIds?: ReadonlyArray<string> },
): Promise<CashCuts> {
  const warehouses = await reportWarehouses(actor, input.warehouseIds)
  const range = periodRange(input.period)
  const result = await db.execute<RawRow>(sql`
    select s.id as session_id, s.warehouse_id, w.name as warehouse_name,
      s.status, s.opened_at, s.closed_at,
      ou.name as opened_by, cu.name as closed_by,
      s.opening_cents, s.counted_cents, s.expected_cents as stored_expected,
      coalesce(sum(m.amount_cents) filter (where m.type = 'sale'), 0)::bigint as sales,
      -- Legacy 'abono' rows are immutable history: they count as cash in.
      coalesce(sum(m.amount_cents) filter (where m.type in ('entry', 'abono')), 0)::bigint as entries,
      coalesce(-sum(m.amount_cents) filter (where m.type = 'withdrawal'), 0)::bigint as withdrawals,
      -- Rider shortages (negative) and surpluses (positive): not sales, entries or withdrawals.
      coalesce(sum(m.amount_cents) filter (where m.type = 'rider_difference'), 0)::bigint as rider_differences
    from cash_sessions s
    join warehouses w on w.id = s.warehouse_id
    join "user" ou on ou.id = s.opened_by
    left join "user" cu on cu.id = s.closed_by
    left join cash_movements m on m.session_id = s.id
    where s.warehouse_id in (${uuidList(warehouses.map((item) => item.id))})
      and ${inRange(sql`coalesce(s.closed_at, s.opened_at)`, range)}
    group by s.id, w.name, ou.name, cu.name
    order by coalesce(s.closed_at, s.opened_at), s.id`)
  const rows = result.rows.map((row): CashCutRow => {
    const sales = Number(row.sales)
    const entries = Number(row.entries)
    const withdrawals = Number(row.withdrawals)
    const riderDifference = Number(row.rider_differences)
    const expected =
      row.stored_expected ??
      row.opening_cents + sales + entries + riderDifference - withdrawals
    const counted = row.counted_cents
    return {
      sessionId: row.session_id,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      status: row.status,
      openedAt: utcDate(row.opened_at),
      closedAt: row.closed_at === null ? null : utcDate(row.closed_at),
      openedByName: row.opened_by,
      closedByName: row.closed_by,
      openingCents: row.opening_cents,
      salesCents: sales,
      entriesCents: entries,
      withdrawalsCents: withdrawals,
      riderDifferenceCents: riderDifference,
      expectedCents: expected,
      countedCents: counted,
      differenceCents: counted === null ? null : counted - expected,
    }
  })
  const riderShortfalls = await getRiderShortfalls(
    warehouses.map((item) => item.id),
    range,
  )
  const closed = rows.filter((row) => row.status === 'closed')
  const sum = (items: Array<CashCutRow>, pick: (row: CashCutRow) => number) =>
    items.reduce((total, row) => total + pick(row), 0)
  return {
    range,
    warehouses,
    rows,
    totals: {
      sessions: rows.length,
      salesCents: sum(rows, (row) => row.salesCents),
      expectedCents: sum(rows, (row) => row.expectedCents),
      countedCents: sum(closed, (row) => row.countedCents ?? 0),
      differenceCents: sum(closed, (row) => row.differenceCents ?? 0),
    },
    riderShortfalls,
  }
}

type ShortfallRaw = {
  rider_id: string
  rider_name: string
  warehouse_id: string
  warehouse_name: string
  deliveries: number
  shortfall: string
  surplus: string
}

/**
 * Net shortage/surplus by rider of the deliveries settled in the range (business
 * days), read from the `rider_difference` drawer movements. The warehouses are
 * already scope-checked by the caller.
 */
async function getRiderShortfalls(
  warehouseIds: ReadonlyArray<string>,
  range: DateRange,
): Promise<Array<RiderShortfallRow>> {
  const result = await db.execute<ShortfallRaw>(sql`
    select r.id as rider_id, r.name as rider_name,
      a.warehouse_id, w.name as warehouse_name,
      count(*)::int as deliveries,
      coalesce(-sum(m.amount_cents) filter (where m.amount_cents < 0), 0)::bigint as shortfall,
      coalesce(sum(m.amount_cents) filter (where m.amount_cents > 0), 0)::bigint as surplus
    from rider_assignments a
    join cash_movements m on m.id = a.difference_movement_id
    join riders r on r.id = a.rider_id
    join warehouses w on w.id = a.warehouse_id
    where a.status = 'Liquidada'
      and a.warehouse_id in (${uuidList(warehouseIds)})
      and ${inRange(sql`a.closed_at`, range)}
    group by r.id, r.name, a.warehouse_id, w.name
    order by sum(m.amount_cents), r.name, r.id`)
  return result.rows.map((row) => {
    const shortfall = Number(row.shortfall)
    const surplus = Number(row.surplus)
    return {
      riderId: row.rider_id,
      riderName: row.rider_name,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      deliveries: row.deliveries,
      shortfallCents: shortfall,
      surplusCents: surplus,
      netCents: surplus - shortfall,
    }
  })
}

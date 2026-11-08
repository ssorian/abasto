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
  PeriodInput,
} from '#/modules/reports/types/reports'

type RawRow = {
  session_id: string
  warehouse_id: string
  warehouse_name: string
  status: 'open' | 'closed'
  opened_at: Date
  closed_at: Date | null
  opened_by: string
  closed_by: string | null
  opening_cents: number
  sales: string
  entries: string
  withdrawals: string
  counted_cents: number | null
  stored_expected: number | null
}

/**
 * Cash cut of every drawer session opened in the period (business days in
 * Mexico City): expected cash, counted cash and the difference. An open
 * session shows its running expected cash and no count yet.
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
      coalesce(-sum(m.amount_cents) filter (where m.type = 'withdrawal'), 0)::bigint as withdrawals
    from cash_sessions s
    join warehouses w on w.id = s.warehouse_id
    join "user" ou on ou.id = s.opened_by
    left join "user" cu on cu.id = s.closed_by
    left join cash_movements m on m.session_id = s.id
    where s.warehouse_id in (${uuidList(warehouses.map((item) => item.id))})
      and ${inRange(sql`s.opened_at`, range)}
    group by s.id, w.name, ou.name, cu.name
    order by s.opened_at, s.id`)
  const rows = result.rows.map((row): CashCutRow => {
    const sales = Number(row.sales)
    const entries = Number(row.entries)
    const withdrawals = Number(row.withdrawals)
    const expected =
      row.stored_expected ?? row.opening_cents + sales + entries - withdrawals
    const counted = row.counted_cents
    return {
      sessionId: row.session_id,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      openedByName: row.opened_by,
      closedByName: row.closed_by,
      openingCents: row.opening_cents,
      salesCents: sales,
      entriesCents: entries,
      withdrawalsCents: withdrawals,
      expectedCents: expected,
      countedCents: counted,
      differenceCents: counted === null ? null : counted - expected,
    }
  })
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
  }
}

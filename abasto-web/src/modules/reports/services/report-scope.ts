import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { businessDate, businessTimeZone } from '#/modules/orders/services/clock'
import { resolvePeriod } from '#/modules/reports/lib/period'
import type {
  DateRange,
  PeriodInput,
  ReportWarehouse,
} from '#/modules/reports/types/reports'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

export const notAllowed = () =>
  new AppError('forbidden', 'No tienes permiso para esta acción.')

/** Executive reports are for the owner only; anyone else is refused. */
export function requireOwner(actor: Actor) {
  if (actor.role !== 'owner') throw notAllowed()
}

/** Warehouses the actor can report on: every one they manage (the owner: all). */
export async function managedWarehouses(
  actor: Actor,
): Promise<Array<ReportWarehouse>> {
  const managed = (await listWarehouses(actor)).filter(({ id }) =>
    can(actor, 'warehouse.manage', id),
  )
  if (actor.role !== 'owner' && !managed.length) throw notAllowed()
  return managed
}

/**
 * Warehouses a report covers: the requested ones (each must be managed by the
 * actor, otherwise the whole request is refused) or all the managed ones.
 */
export async function reportWarehouses(
  actor: Actor,
  requested?: ReadonlyArray<string>,
): Promise<Array<ReportWarehouse>> {
  const managed = await managedWarehouses(actor)
  if (!requested?.length) return managed
  const ids = new Set(requested)
  if (![...ids].every((id) => managed.some((item) => item.id === id))) {
    throw notAllowed()
  }
  return managed.filter((item) => ids.has(item.id))
}

/** Business-date range of a period, relative to today in Mexico City. */
export const periodRange = (period: PeriodInput): DateRange =>
  resolvePeriod(period, businessDate())

/** `a, b, c` of uuid parameters for an `in (...)` list. */
export const uuidList = (ids: ReadonlyArray<string>): SQL =>
  ids.length
    ? sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      )
    : sql`null::uuid`

/** Local business day of a UTC `timestamp` column, as a date. */
export const localDay = (column: SQL): SQL =>
  sql`((${column} at time zone 'UTC') at time zone ${businessTimeZone})::date`

/** `column` falls inside the business-date range, bounds taken as local midnights. */
export const inRange = (column: SQL, range: DateRange): SQL =>
  sql`${column} >= ((${range.from}::date)::timestamp at time zone ${businessTimeZone}) at time zone 'UTC'
    and ${column} < ((${range.to}::date + 1)::timestamp at time zone ${businessTimeZone}) at time zone 'UTC'`

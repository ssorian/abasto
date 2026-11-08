import { addDays, daysBetween } from '#/modules/reports/lib/period'
import type { DateRange } from '#/modules/reports/types/reports'
import type {
  WarehouseDelta,
  WarehouseMetrics,
} from '#/modules/executive/types/profitability'

/** Margin over revenue in basis points (10000 = 100 %); null without revenue. */
export const marginBps = (marginCents: number, revenueCents: number) =>
  revenueCents > 0 ? Math.round((marginCents * 10_000) / revenueCents) : null

/** The period of equal length that ends the day before `range` starts. */
export function previousRange(range: DateRange): DateRange {
  const days = daysBetween(range.from, range.to) + 1
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) }
}

export function metricsOf(
  revenueCents: number,
  costCents: number,
  tickets: number,
): WarehouseMetrics {
  const marginCents = revenueCents - costCents
  return {
    revenueCents,
    costCents,
    marginCents,
    marginBps: marginBps(marginCents, revenueCents),
    tickets,
    averageTicketCents: tickets ? Math.round(revenueCents / tickets) : 0,
  }
}

export function deltaOf(
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
): WarehouseDelta {
  return {
    revenueCents: current.revenueCents - previous.revenueCents,
    marginCents: current.marginCents - previous.marginCents,
    marginBps:
      current.marginBps === null || previous.marginBps === null
        ? null
        : current.marginBps - previous.marginBps,
    tickets: current.tickets - previous.tickets,
    averageTicketCents:
      current.averageTicketCents - previous.averageTicketCents,
    revenueChangeBps: previous.revenueCents
      ? Math.round(
          ((current.revenueCents - previous.revenueCents) * 10_000) /
            previous.revenueCents,
        )
      : null,
  }
}

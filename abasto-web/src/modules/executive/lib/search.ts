import { parseReportSearch } from '#/modules/reports/lib/search'
import type { ReportSearch } from '#/modules/reports/lib/search'
import { NON_MOVING_DAYS } from '#/modules/executive/types/inventory'
import type { NonMovingDays } from '#/modules/executive/types/inventory'

/** URL state of the owner dashboard: period, warehouse and supplier filters, non-moving window. */
export type ExecutiveSearch = Pick<
  ReportSearch,
  'periodo' | 'desde' | 'hasta' | 'almacen' | 'proveedor'
> & {
  /** Days without a sale; absent means the default. */
  sinventa?: NonMovingDays
}

export const defaultNonMovingDays: NonMovingDays = 30

/** Reuses the reports period parsing; keeps only well-formed values. */
export function parseExecutiveSearch(
  raw: Record<string, unknown>,
): ExecutiveSearch {
  const { periodo, desde, hasta, almacen, proveedor } = parseReportSearch(raw)
  const days = NON_MOVING_DAYS.find((item) => item === Number(raw.sinventa))
  return {
    ...(periodo ? { periodo } : {}),
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
    ...(almacen ? { almacen } : {}),
    ...(proveedor ? { proveedor } : {}),
    ...(days && days !== defaultNonMovingDays ? { sinventa: days } : {}),
  }
}

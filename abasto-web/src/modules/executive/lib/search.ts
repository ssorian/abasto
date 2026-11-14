import { parseReportSearch } from '#/modules/reports/lib/search'
import type { ReportSearch } from '#/modules/reports/lib/search'
import { NON_MOVING_DAYS } from '#/modules/executive/types/inventory'
import type { NonMovingDays } from '#/modules/executive/types/inventory'
import type { PeriodInput, PeriodPreset } from '#/modules/reports/types/reports'

/** URL state of the owner dashboard: period, warehouse and supplier filters, non-moving window. */
export type ExecutiveSearch = Pick<
  ReportSearch,
  'periodo' | 'desde' | 'hasta' | 'almacen' | 'proveedor'
> & {
  /** Days without a sale; absent means the default. */
  sinventa?: NonMovingDays
}

export const defaultNonMovingDays: NonMovingDays = 30

/** The owner works in calendar periods; the week is the default and stays out of the URL. */
export const defaultExecutivePreset: PeriodPreset = 'week'
const keptPresets: ReadonlyArray<PeriodPreset> = ['today', 'month', 'custom']

/** Reuses the reports period parsing; keeps only well-formed values. */
export function parseExecutiveSearch(
  raw: Record<string, unknown>,
): ExecutiveSearch {
  const { desde, hasta, almacen, proveedor } = parseReportSearch(raw)
  const periodo = keptPresets.find((item) => item === String(raw.periodo))
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

/**
 * Period of the owner dashboard. The URL is shared with the manager view, so a
 * rolling preset left there by it reads as the default week.
 */
export function executivePeriodOf(
  search: Pick<ExecutiveSearch, 'periodo' | 'desde' | 'hasta'>,
): PeriodInput {
  const preset = keptPresets.find((item) => item === search.periodo)
  if (preset === 'custom') {
    return { preset, from: search.desde, to: search.hasta }
  }
  return { preset: preset ?? defaultExecutivePreset }
}

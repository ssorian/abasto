import { parseReportSearch } from '#/modules/reports/lib/search'
import type { ReportSearch } from '#/modules/reports/lib/search'

/** URL state of the manager dashboard: the period and the warehouse picked. */
export type ManagerReportsSearch = Pick<
  ReportSearch,
  'periodo' | 'desde' | 'hasta' | 'almacen' | 'proveedor'
>

/** Keeps only the period, warehouse and supplier; defaults stay out of the URL. */
export function parseManagerReportsSearch(
  search: Record<string, unknown>,
): ManagerReportsSearch {
  const { periodo, desde, hasta, almacen, proveedor } =
    parseReportSearch(search)
  return {
    ...(periodo ? { periodo } : {}),
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
    ...(almacen ? { almacen } : {}),
    ...(proveedor ? { proveedor } : {}),
  }
}

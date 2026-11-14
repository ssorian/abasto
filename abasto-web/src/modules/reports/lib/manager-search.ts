import { parseExecutiveSearch } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'

/** URL state of the manager dashboard: the period and the warehouse picked. */
export type ManagerReportsSearch = Pick<
  ExecutiveSearch,
  'periodo' | 'desde' | 'hasta' | 'almacen' | 'proveedor'
>

/**
 * Keeps only the period, warehouse and supplier. Calendar periods like the
 * owner's: the week is the default and stays out of the URL.
 */
export function parseManagerReportsSearch(
  search: Record<string, unknown>,
): ManagerReportsSearch {
  const { periodo, desde, hasta, almacen, proveedor } =
    parseExecutiveSearch(search)
  return {
    ...(periodo ? { periodo } : {}),
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
    ...(almacen ? { almacen } : {}),
    ...(proveedor ? { proveedor } : {}),
  }
}

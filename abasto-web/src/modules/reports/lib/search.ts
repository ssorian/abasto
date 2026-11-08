import type {
  PeriodInput,
  PeriodPreset,
  ReportTab,
} from '#/modules/reports/types/reports'

/** URL state of /reportes. Absent values are defaults and stay out of the URL. */
export type ReportSearch = {
  tab?: ReportTab
  periodo?: PeriodPreset
  desde?: string
  hasta?: string
  almacen?: string
  proveedor?: string
  dias?: number
}

const tabs: ReadonlyArray<ReportTab> = [
  'ventas',
  'cajas',
  'inventario',
  'cartera',
]
const presets: ReadonlyArray<PeriodPreset> = ['today', '7', '30', 'custom']

export const defaultPreset: PeriodPreset = '7'
export const defaultExpiringDays = 7

const text = (value: unknown) =>
  typeof value === 'string' && value !== '' ? value : undefined

/** Keeps only well-formed values; the services validate dates and permissions. */
export function parseReportSearch(raw: Record<string, unknown>): ReportSearch {
  const tab = tabs.find((item) => item === raw.tab)
  const periodo = presets.find((item) => item === String(raw.periodo))
  const dias = Number(raw.dias)
  return {
    ...(tab && tab !== 'ventas' ? { tab } : {}),
    ...(periodo && periodo !== defaultPreset ? { periodo } : {}),
    ...(text(raw.desde) ? { desde: text(raw.desde) } : {}),
    ...(text(raw.hasta) ? { hasta: text(raw.hasta) } : {}),
    ...(text(raw.almacen) ? { almacen: text(raw.almacen) } : {}),
    ...(text(raw.proveedor) ? { proveedor: text(raw.proveedor) } : {}),
    ...(Number.isInteger(dias) && dias > 0 && dias !== defaultExpiringDays
      ? { dias }
      : {}),
  }
}

export function periodOf(search: ReportSearch): PeriodInput {
  const preset = search.periodo ?? defaultPreset
  return preset === 'custom'
    ? { preset, from: search.desde, to: search.hasta }
    : { preset }
}

import type {
  GroupMode,
  LossReason,
  PeriodMode,
} from '#/modules/reports/types/reports'

/** Option that disables a filter. */
export const ALL = 'Todos'

export const unregistered = 'Sin registrar'

export const salesChannels = ['App', 'Mostrador', 'Teléfono', 'WhatsApp']

export const periodOptions: Array<{ value: PeriodMode; label: string }> = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]

export const groupOptions: Array<{ value: GroupMode; label: string }> = [
  { value: 'product', label: 'Por producto' },
  { value: 'lot', label: 'Por lote / recepción' },
  { value: 'warehouse', label: 'Por almacén' },
  { value: 'channel', label: 'Por canal' },
]

export const groupHeadings: Record<GroupMode, string> = {
  product: 'Producto',
  lot: 'Lote / recepción',
  channel: 'Canal',
  warehouse: 'Almacén',
}

export const lossReasonFilters: Array<LossReason | typeof ALL> = [
  ALL,
  'Merma',
  'Producto dañado',
  'Caducidad',
  'Pérdida',
  'Diferencia de inventario',
  'Faltante en traslado',
  'Otras salidas manuales',
]

/** Manual-exit reasons that are reported under their own name. */
export const namedManualReasons: Array<LossReason> = [
  'Merma',
  'Producto dañado',
  'Caducidad',
  'Pérdida',
]

export const agingThresholds = [0, 7, 14, 30, 60, 90]

/** Margin under which a sale needs a reason before it is registered. */
export const minimumMarginPct = 10

export const operatorName = 'Mariana Ruiz'

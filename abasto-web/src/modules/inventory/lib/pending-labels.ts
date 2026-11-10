import type { PendingType, PurchaseStatus } from '#/modules/inventory/db/schema'

export const pendingTypeLabels: Record<PendingType, string> = {
  damaged: 'Dañado o caducado',
  missing: 'Faltante',
  replaced: 'Repuesto',
  written_off: 'Descontado del pago',
  discounted: 'Descontado en un pedido',
  returned: 'Devuelto al proveedor',
  reopened: 'Reabierto',
}

/** Order statuses in the filter of "Por recibir". */
export const orderFilters: ReadonlyArray<PurchaseStatus | 'Todos'> = [
  'Pedido',
  'Recibido',
  'Cancelado',
  'Todos',
]

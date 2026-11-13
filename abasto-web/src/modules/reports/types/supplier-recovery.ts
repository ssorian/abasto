import type { DateRange } from '#/modules/reports/types/reports'

/**
 * Money with suppliers: what they gave back, what they still owe and what was
 * lost. All amounts are cents; balances are company-wide, only stock losses
 * follow the warehouse filter.
 */
export type SupplierRecovery = {
  range: DateRange
  /** Recuperado = discountedCents + replacedCents. */
  recoveredCents: number
  /** Descontado en pedidos: discounts of missing balances and credits, net of reopenings. */
  discountedCents: number
  /** Repuesto en mercadería: replacements received. */
  replacedCents: number
  /** Pendiente: open value of missing, damaged and credit balances now. */
  pendingCents: number
  /** Perdido = scrappedCents + unrecognizedCents + inventoryLossCents. */
  lostCents: number
  /** Merma de proveedor: damaged boxes closed as merma. */
  scrappedCents: number
  /** No reconocido en devoluciones: returned value the supplier did not credit. */
  unrecognizedCents: number
  /** Pérdidas de inventario: stock losses at their lot's unit cost. */
  inventoryLossCents: number
}

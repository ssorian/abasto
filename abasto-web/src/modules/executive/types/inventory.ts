import type { ReportWarehouse } from '#/modules/reports/types/reports'

export const NON_MOVING_DAYS = [30, 60, 90] as const
export type NonMovingDays = (typeof NON_MOVING_DAYS)[number]

export type WarehouseInventoryValue = ReportWarehouse & {
  /** Units on hand across lots with stock. */
  units: number
  valueCents: number
}

export type InventoryValue = {
  warehouses: Array<WarehouseInventoryValue>
  totalCents: number
}

export type NonMovingRow = {
  warehouseId: string
  warehouseName: string
  productId: string
  name: string
  sku: string
  unit: string
  onHand: number
  valueCents: number
  /** Business date (YYYY-MM-DD) of the last sale, null if never sold there. */
  lastSaleOn: string | null
  /** Whole days between the last sale and today, null if never sold. */
  daysSinceLastSale: number | null
}

export type NonMovingCapital = {
  days: NonMovingDays
  rows: Array<NonMovingRow>
  totalCents: number
}

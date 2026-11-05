import type {
  ProductStock,
  StockMovementRow,
} from '#/modules/inventory/services/stock-reads'

/** A warehouse the actor can see, with whether they may write to it. */
export type WarehouseOption = { id: string; name: string; canManage: boolean }

/** A ledger row plus the product its lot belongs to. */
export type MovementEntry = StockMovementRow & { productId: string }

export type InventoryOverview = {
  warehouses: Array<WarehouseOption>
  selectedId: string | null
  /** Business day (YYYY-MM-DD) the expiry states are computed against. */
  today: string
  stock: Array<ProductStock>
  movements: Array<MovementEntry>
}

import type { SellableOption } from '#/modules/counter/lib/sellable'
import type { CashSessionDetail } from '#/modules/cash/services/cash-sessions'
import type { OrderSummary } from '#/modules/orders/services/order-reads'

export type CounterWarehouse = { id: string; name: string }

/** Everything Mostrador needs for one warehouse. */
export type CounterOverview = {
  /** Warehouses the actor can operate. */
  warehouses: Array<CounterWarehouse>
  selectedId: string | null
  /** Server time, so expiry labels render the same on server and client. */
  now: Date
  reservationHours: number
  /** Only the owner changes how long a reservation lasts. */
  canSetHours: boolean
  /** The selected warehouse's open drawer with its movements, or null. */
  cash: CashSessionDetail | null
  /** Owner and the warehouse's manager read the session history. */
  canViewCashHistory: boolean
  orders: Array<OrderSummary>
  /** Active customers an order can be placed for. */
  customers: Array<{ id: string; name: string }>
  /** Priced presentations of the selected warehouse. */
  sellable: Array<SellableOption>
}

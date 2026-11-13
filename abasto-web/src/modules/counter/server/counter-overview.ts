import { can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { archivedProductIds } from '#/modules/catalog/services/product-reads'
import { getOpenCashSession } from '#/modules/cash/services/cash-sessions'
import { buildSellable } from '#/modules/counter/lib/sellable'
import type { CounterOverview } from '#/modules/counter/types/counter-view'
import { listCustomers } from '#/modules/customers/services/customers'
import { getWarehouseStock } from '#/modules/inventory/services/stock-reads'
import { listOrders } from '#/modules/orders/services/order-reads'
import { getReservationHours } from '#/modules/orders/services/reservation-settings'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

/** The selected warehouse (or the first operable one) with its orders and composer data. */
export async function getCounterOverview(
  actor: Actor,
  warehouseId?: string,
): Promise<CounterOverview> {
  const warehouses = (await listWarehouses(actor)).filter(({ id }) =>
    can(actor, 'warehouse.operate', id),
  )
  const selected =
    warehouses.find(({ id }) => id === warehouseId) ?? warehouses.at(0)
  const base = {
    warehouses,
    now: new Date(),
    reservationHours: await getReservationHours(actor),
    canSetHours: can(actor, 'warehouses.manage'),
  }
  if (!selected) {
    return {
      ...base,
      selectedId: null,
      cash: null,
      canViewCashHistory: false,
      orders: [],
      customers: [],
      sellable: [],
    }
  }
  const [orders, customers, prices, stock, cash, archived] = await Promise.all([
    listOrders(actor, { warehouseId: selected.id }),
    listCustomers(actor, { active: true }),
    listWarehousePrices(actor, selected.id),
    getWarehouseStock(actor, selected.id),
    getOpenCashSession(actor, selected.id),
    archivedProductIds(),
  ])
  return {
    ...base,
    selectedId: selected.id,
    cash,
    canViewCashHistory: can(actor, 'warehouse.manage', selected.id),
    orders,
    customers: customers.map(({ id, name }) => ({ id, name })),
    sellable: buildSellable(
      prices.filter((price) => !archived.has(price.productId)),
      stock,
    ),
  }
}

import type { Actor } from '#/modules/access/lib/policy'
import { can } from '#/modules/access/lib/policy'
import { getCustomer } from '#/modules/customers/services/customers'
import { listOrders } from '#/modules/orders/services/order-reads'
import type { OrderSummary } from '#/modules/orders/services/order-reads'
import { listWarehouses } from '#/modules/warehouses/services/warehouses'

export type CustomerOrder = OrderSummary & { warehouseName: string }

/** A customer's orders in every warehouse the actor operates, newest first. */
export async function listCustomerOrders(
  actor: Actor,
  customerId: string,
): Promise<Array<CustomerOrder>> {
  await getCustomer(actor, customerId)
  const warehouses = (await listWarehouses(actor)).filter(({ id }) =>
    can(actor, 'warehouse.operate', id),
  )
  const perWarehouse = await Promise.all(
    warehouses.map(async ({ id, name }) =>
      (await listOrders(actor, { warehouseId: id, customerId })).map(
        (order) => ({ ...order, warehouseName: name }),
      ),
    ),
  )
  return perWarehouse
    .flat()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

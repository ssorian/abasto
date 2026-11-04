import { demoCustomers } from '#/shared/demo/customers'
import { demoPendingOrders } from '#/shared/demo/orders'
import { businessDate } from '#/lib/utils/format'

import type { CustomerOrderSummary, CustomerRecord } from './customer-types'

export const seedCustomers = (): Array<CustomerRecord> =>
  demoCustomers.map((customer) => ({
    ...customer,
    addresses: [...customer.addresses],
    rules: [],
  }))

/**
 * Seed orders are unreconciled reservations: the reference shows no channel,
 * no delivered sale and no previous collections for them.
 */
export const seedOrders = (): Array<CustomerOrderSummary> => {
  const date = businessDate()
  return demoPendingOrders.map((order) => ({
    id: order.id,
    customerId: order.customerId,
    date,
    channel: 'Sin registrar',
    status: order.status,
    soldCents: 0,
    paidCents: 0,
  }))
}

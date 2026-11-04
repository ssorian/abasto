import { useState } from 'react'

import {
  seedCustomers,
  seedOrders,
} from '#/modules/customers/lib/customer-seed'

import type { CustomerRecord } from '#/modules/customers/lib/customer-types'

/** Local, non-persistent customer book seeded from the demo data. */
export function useCustomers() {
  const [customers, setCustomers] = useState(seedCustomers)
  const [orders] = useState(seedOrders)

  const upsertCustomer = (customer: CustomerRecord) =>
    setCustomers((current) =>
      current.some(({ id }) => id === customer.id)
        ? current.map((item) => (item.id === customer.id ? customer : item))
        : [...current, customer],
    )

  return { customers, orders, upsertCustomer }
}

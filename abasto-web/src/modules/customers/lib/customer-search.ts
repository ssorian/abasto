import type { CustomerRecord } from './customer-types'

/** Matches name, contact or phone; the reference only lowercases (no accent folding). */
export function filterCustomers(
  customers: ReadonlyArray<CustomerRecord>,
  query: string,
) {
  const needle = query.toLowerCase()
  return customers.filter((customer) =>
    `${customer.name} ${customer.contact} ${customer.phone}`
      .toLowerCase()
      .includes(needle),
  )
}

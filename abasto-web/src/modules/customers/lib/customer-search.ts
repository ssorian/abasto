/** Matches name, contact or phone; the reference only lowercases (no accent folding). */
export function filterCustomers<
  T extends { name: string; contact: string; phone: string },
>(customers: ReadonlyArray<T>, query: string): Array<T> {
  const needle = query.toLowerCase()
  return customers.filter((customer) =>
    `${customer.name} ${customer.contact} ${customer.phone}`
      .toLowerCase()
      .includes(needle),
  )
}

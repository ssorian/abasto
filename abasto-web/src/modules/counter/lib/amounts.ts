import type {
  Allocation,
  CounterState,
  Order,
} from '#/modules/counter/types/counter'

/** Cents for `qty` base units of an allocation, priced per presentation. */
export const amountFor = (allocation: Allocation, qty: number) =>
  Math.round((qty * allocation.unitPriceCents) / allocation.priceFactor)

export const allocationTotal = (allocations: ReadonlyArray<Allocation>) =>
  allocations.reduce((sum, a) => sum + amountFor(a, a.qty), 0)

/** Base units still to prepare or send. */
export const remaining = (a: Allocation) => a.qty - a.sent - a.cancelled

export const orderAllocations = (order: Order) =>
  order.lines.flatMap((line) => line.allocations)

/** Value of the order after cancellations, rejections and returns. */
export const committedCents = (order: Order) =>
  orderAllocations(order).reduce(
    (sum, a) =>
      sum +
      amountFor(a, a.qty - a.cancelled - a.rejected) -
      amountFor(a, a.returned),
    0,
  )

export const paidCents = (state: CounterState, orderId: string) =>
  state.payments
    .filter((p) => p.orderId === orderId)
    .reduce((sum, p) => sum + p.amountCents * (p.type === 'Cobro' ? 1 : -1), 0)

/** Delivered value net of returns. */
export const soldCents = (order: Order) =>
  orderAllocations(order).reduce(
    (sum, a) => sum + amountFor(a, a.delivered) - amountFor(a, a.returned),
    0,
  )

/** Gross margin percentage of an allocation. */
export function allocationMargin(a: Allocation) {
  const revenue = amountFor(a, a.qty)
  const cost = a.qty * a.costPerUnitCents
  return revenue > 0 ? ((revenue - cost) / revenue) * 100 : -100
}

/** Pending amount of the customer's open orders (uses credit). */
export const exposureCents = (state: CounterState, customerId: string) =>
  state.orders
    .filter((o) => o.customerId === customerId)
    .reduce(
      (sum, o) => sum + Math.max(0, committedCents(o) - paidCents(state, o.id)),
      0,
    )

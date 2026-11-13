/** "A pagar" is only worth showing when a discount made it differ from the total. */
export const showsPayable = (order: {
  totalCostCents: number
  payableCents: number
}) => order.payableCents !== order.totalCostCents

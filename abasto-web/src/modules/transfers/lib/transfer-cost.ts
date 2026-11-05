/**
 * Cost in cents of `received` units of a lot bought for `costCents` in
 * `quantity` units: the unit cost is kept, so the cost is prorated and rounded
 * half up once. BigInt keeps the product exact near the int4 limits.
 */
export function transferredCostCents(
  costCents: number,
  quantity: number,
  received: number,
): number {
  const cost = BigInt(costCents)
  const units = BigInt(quantity)
  return Number((cost * BigInt(received) * 2n + units) / (2n * units))
}

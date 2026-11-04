import { formatCents } from './customer-format'

import type { CustomerRecord } from './customer-types'

export type CustomerReview = {
  /** Whether the change needs a written reason before it is registered. */
  sensitive: boolean
  /** "Crédito $x · N días" before the change; undefined for a new customer. */
  before?: string
  after: string
}

const creditLine = (customer: CustomerRecord) =>
  `Crédito ${formatCents(customer.creditLimitCents)} · ${customer.termsDays} días`

/** Credit terms and commercial rules are sensitive; plain contact edits are not. */
export function reviewCustomerChange(
  previous: CustomerRecord | undefined,
  next: CustomerRecord,
): CustomerReview {
  const sensitive = previous
    ? (next.credit && !previous.credit) ||
      next.creditLimitCents !== previous.creditLimitCents ||
      next.termsDays !== previous.termsDays ||
      JSON.stringify(next.rules) !== JSON.stringify(previous.rules)
    : next.credit || next.rules.length > 0

  return {
    sensitive,
    before: previous ? creditLine(previous) : undefined,
    after: creditLine(next),
  }
}

export const hasChanges = (
  previous: CustomerRecord | undefined,
  next: CustomerRecord,
) => !previous || JSON.stringify(previous) !== JSON.stringify(next)

import type { Customer } from '#/shared/demo/types'

/** Negotiated condition for one product once the order reaches a minimum quantity. */
export type CommercialRule = {
  productId: string
  minQuantity: number
  discountPercent: number
  /** Agreed unit price in integer MXN cents; replaces the lot price when set. */
  priceCents?: number
}

export type CustomerRecord = Customer & {
  rules: Array<CommercialRule>
}

/** Order shown in the customer history (seed orders have no deliveries or payments yet). */
export type CustomerOrderSummary = {
  id: string
  customerId: string
  /** Business date as YYYY-MM-DD. */
  date: string
  channel: string
  status: string
  soldCents: number
  paidCents: number
}

/** Form-side representation: every editable number stays a string while typing. */
export type CommercialRuleDraft = {
  productId: string
  minQuantity: string
  discountPercent: string
  price: string
}

export type CustomerDraft = {
  id: string
  name: string
  contact: string
  phone: string
  active: boolean
  addresses: string
  notes: string
  credit: boolean
  creditLimit: string
  termsDays: string
  rules: Array<CommercialRuleDraft>
}

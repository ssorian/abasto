/** What the screens need of a customer (the server sends more). */
export type CustomerView = {
  id: string
  name: string
  contact: string
  phone: string
  addresses: Array<string>
  notes: string
  active: boolean
  /** Owner only: the customer already has a store account. */
  hasStoreAccess: boolean
}

/** A commercial rule as stored: exactly one of discount or fixed price is set. */
export type RuleView = {
  presentationId: string
  minQuantity: number
  discountBps: number | null
  priceCents: number | null
}

/** A presentation a rule can target. */
export type PresentationOption = { id: string; label: string; sku?: string }

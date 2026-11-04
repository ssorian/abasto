import type { CustomerDraft, CustomerRecord } from './customer-types'

export const emptyDraft = (): CustomerDraft => ({
  id: '',
  name: '',
  contact: '',
  phone: '',
  active: true,
  addresses: '',
  notes: '',
  credit: false,
  creditLimit: '',
  termsDays: '15',
  rules: [],
})

const centsToInput = (cents: number) => (cents ? String(cents / 100) : '')

export const draftFromCustomer = (customer: CustomerRecord): CustomerDraft => ({
  id: customer.id,
  name: customer.name,
  contact: customer.contact,
  phone: customer.phone,
  active: customer.active,
  addresses: customer.addresses.join('\n'),
  notes: customer.notes,
  credit: customer.credit,
  creditLimit: centsToInput(customer.creditLimitCents),
  termsDays: String(customer.termsDays),
  rules: customer.rules.map((rule) => ({
    productId: rule.productId,
    minQuantity: String(rule.minQuantity),
    discountPercent: String(rule.discountPercent),
    price: rule.priceCents === undefined ? '' : String(rule.priceCents / 100),
  })),
})

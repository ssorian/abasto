import type { CustomerRecord } from './customer-types'

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export const formatCents = (cents: number) => mxn.format(cents / 100)

export const termsLabel = (customer: CustomerRecord) =>
  customer.credit
    ? `${customer.termsDays} días · ${formatCents(customer.creditLimitCents)}`
    : 'Contado'

export const statusLabel = (customer: CustomerRecord) =>
  customer.active ? 'Activo' : 'Inactivo'

export const contactLine = (customer: CustomerRecord) =>
  `${customer.contact || 'Sin contacto'} · ${customer.phone || 'Sin teléfono'}`

export const creditSummary = (customer: CustomerRecord) =>
  `${
    customer.credit
      ? `Crédito: ${formatCents(customer.creditLimitCents)} · ${customer.termsDays} días`
      : 'Venta de contado'
  } · ${statusLabel(customer)}`

import type { Customer } from './types'

const businessCustomers: Array<Pick<Customer, 'name' | 'contact'>> = [
  { name: 'Abarrotes Don Pepe', contact: 'José Hernández' },
  { name: 'La Esquinita', contact: 'Ana López' },
  { name: 'Miscelánea Lupita', contact: 'Guadalupe Pérez' },
]

export const publicCustomerId = 'public'

export const demoCustomers: ReadonlyArray<Customer> = [
  {
    id: publicCustomerId,
    name: 'Público general',
    contact: '',
    phone: '',
    addresses: [],
    notes: 'Ventas sin registro de cliente.',
    active: true,
    credit: false,
    creditLimitCents: 0,
    termsDays: 0,
  },
  ...businessCustomers.map(({ name, contact }, index): Customer => ({
    id: `cli-${index}`,
    name,
    contact,
    phone: `555000030${index}`,
    addresses: ['Domicilio de ejemplo · Tejupilco'],
    notes: 'Cliente de demostración',
    active: true,
    credit: true,
    creditLimitCents: 5_000_000,
    termsDays: 15,
  })),
]

export function findCustomer(customerId: string) {
  return demoCustomers.find((customer) => customer.id === customerId)
}

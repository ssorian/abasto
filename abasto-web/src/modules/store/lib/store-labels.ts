import type { StatusTone } from '#/components/status-badge'
import type {
  Availability,
  StoreOrderStatus,
} from '#/modules/store/services/storefront'

const availabilityTones: Record<Availability, StatusTone> = {
  Disponible: 'green',
  Pocas: 'amber',
  Agotado: 'gray',
}

const statusTones: Record<StoreOrderStatus, StatusTone> = {
  Reservado: 'blue',
  Preparado: 'amber',
  Recogido: 'green',
  Cancelado: 'gray',
  Vencido: 'red',
}

export const availabilityTone = (availability: Availability) =>
  availabilityTones[availability]

export const orderStatusTone = (status: StoreOrderStatus) => statusTones[status]

/** Sold-out presentations cannot be added to the cart. */
export const canAddToCart = (availability: Availability) =>
  availability !== 'Agotado'

/** Customers cancel only while the order is Reservado. */
export const canCancelOrder = (status: StoreOrderStatus) =>
  status === 'Reservado'

/** "PED-3F2A9C1E": the first 8 characters of the order id. */
export const storeOrderCode = (id: string) =>
  `PED-${id.slice(0, 8).toUpperCase()}`

const pickupFormat = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** "lunes, 9 nov 2026, 2:30 p.m." (Mexico City time). */
export const formatPickupDate = (date: Date) => pickupFormat.format(date)

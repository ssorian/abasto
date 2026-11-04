import type { StatusTone } from '#/components/status-badge'

/** Illustrative overview data copied from the reference design. */

export type OverviewMetric = { label: string; value: string }

export type PendingOrder = {
  customer: string
  folio: string
  warehouse: string
  status: string
  tone: StatusTone
}

export type ExpiringLot = {
  product: string
  warehouse: string
  lot: string
  expiresOn: string
  status: string
  tone: StatusTone
}

export type RestockItem = {
  product: string
  warehouse: string
  minimum: number
  stock: number
  unit: string
}

export type OpenCashRegister = { name: string; detail: string; amount: string }

export type OverdueCollection = {
  customer: string
  detail: string
  amount: string
}

export type RecentActivity = { title: string; detail: string }

export const overviewMetrics: Array<OverviewMetric> = [
  { label: 'Ventas netas de hoy', value: '$0.00' },
  { label: 'Cobrado neto hoy', value: '$0.00' },
  { label: 'Crédito vencido', value: '$0.00' },
  { label: 'Operaciones por completar', value: '3' },
]

export const openCashRegisters: Array<OpenCashRegister> = []

export const pendingOrders: Array<PendingOrder> = [
  {
    customer: 'Abarrotes Don Pepe',
    folio: 'ABR-4821',
    warehouse: 'Centro',
    status: 'Reservado',
    tone: 'blue',
  },
  {
    customer: 'La Esquinita',
    folio: 'ABR-4822',
    warehouse: 'Centro',
    status: 'Reservado',
    tone: 'blue',
  },
  {
    customer: 'Miscelánea Lupita',
    folio: 'ABR-4823',
    warehouse: 'Centro',
    status: 'Reservado',
    tone: 'blue',
  },
]

export const expiringLots: Array<ExpiringLot> = [
  {
    product: 'Leche Lala Entera',
    warehouse: 'Centro',
    lot: 'L-A-4',
    expiresOn: '2026-11-16',
    status: 'Por vencer',
    tone: 'amber',
  },
  {
    product: 'Leche Lala Entera',
    warehouse: 'Norte',
    lot: 'L-A-4',
    expiresOn: '2026-11-16',
    status: 'Por vencer',
    tone: 'amber',
  },
]

export const restockItems: Array<RestockItem> = [
  {
    product: 'Sabritas Original',
    warehouse: 'Centro',
    minimum: 600,
    stock: 360,
    unit: 'piezas',
  },
  {
    product: 'Frijoles La Costeña',
    warehouse: 'Centro',
    minimum: 120,
    stock: 0,
    unit: 'piezas',
  },
  {
    product: 'Agua Ciel',
    warehouse: 'Centro',
    minimum: 180,
    stock: 120,
    unit: 'piezas',
  },
  {
    product: 'Spaghetti La Moderna',
    warehouse: 'Centro',
    minimum: 200,
    stock: 0,
    unit: 'piezas',
  },
]

export const overdueCollections: Array<OverdueCollection> = []

export const recentActivity: Array<RecentActivity> = []

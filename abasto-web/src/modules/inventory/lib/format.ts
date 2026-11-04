const moneyFormat = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
})

/** Formats MXN pesos, e.g. `$16.33`. */
export const money = (value: number) => moneyFormat.format(value)

/** `01 nov 2026`; accepts ISO dates and datetimes. */
export const dateLabel = (date: string) =>
  new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString(
    'es-MX',
    { day: '2-digit', month: 'short', year: 'numeric' },
  )

/** `10:30 a.m.` */
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

/** Accent-insensitive lowercase used by every search box. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const singulars: Record<string, string> = {
  cajas: 'caja',
  piezas: 'pieza',
  bultos: 'bulto',
  paquetes: 'paquete',
}

export const unitSingular = (unit: string) => singulars[unit] ?? unit

/** Local calendar day `offset` days from today, as YYYY-MM-DD. */
export function dayFromToday(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export const today = () => dayFromToday(0)

/** Local `datetime-local` value for now. */
export function localDateTime() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

export const isValidMoney = (value: number) =>
  Number.isFinite(value) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6

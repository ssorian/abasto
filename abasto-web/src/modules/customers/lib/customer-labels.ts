import { formatBps, formatCents } from '#/modules/pricing/lib/money'
import type {
  CustomerView,
  PresentationOption,
  RuleView,
} from '#/modules/customers/lib/customer-view'

export const statusLabel = (customer: Pick<CustomerView, 'active'>) =>
  customer.active ? 'Activo' : 'Inactivo'

export const contactLine = (
  customer: Pick<CustomerView, 'contact' | 'phone'>,
) =>
  `${customer.contact || 'Sin contacto'} · ${customer.phone || 'Sin teléfono'}`

/** "Leche · Caja: 12.5% desde 5" or "…: $438.50 desde 1". */
export function ruleLabel(
  rule: RuleView,
  names: ReadonlyMap<string, string>,
): string {
  const value =
    rule.priceCents !== null
      ? formatCents(rule.priceCents)
      : `${formatBps(rule.discountBps ?? 0)}%`
  return `${names.get(rule.presentationId) ?? 'Presentación'}: ${value} desde ${rule.minQuantity}`
}

/** One option per active presentation, labelled "Producto · Presentación". */
export function presentationOptions(
  products: ReadonlyArray<{
    name: string
    sku?: string
    presentations: ReadonlyArray<{ id: string; name: string; active: boolean }>
  }>,
): Array<PresentationOption> {
  return products.flatMap((product) =>
    product.presentations
      .filter((presentation) => presentation.active)
      .map((presentation) => ({
        id: presentation.id,
        label: `${product.name} · ${presentation.name}`,
        ...(product.sku ? { sku: product.sku } : {}),
      })),
  )
}

const dateTime = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Date and time in the business time zone, the same on server and client. */
export const formatOrderDate = (date: Date) => dateTime.format(date)

/** Help line under "Condiciones comerciales" when there are no rules, else null. */
export const rulesSummary = (count: number) =>
  count === 0 ? 'Sin condiciones: compra a precio de lista.' : null

/** Presentation options in the shape of the shared searchable picker. */
export const pickerItems = (options: ReadonlyArray<PresentationOption>) =>
  options.map(({ id, label, sku }) => ({ id, name: label, sku: sku ?? '' }))

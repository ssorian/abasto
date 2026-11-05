import { formatBps, formatCents } from '#/modules/pricing/lib/money'

type Rule = {
  minQuantity: number
  discountBps: number | null
  priceCents: number | null
}

/** "PED-3F2A9C1E": the first 8 characters of the order id. */
export const orderCode = (id: string) => `PED-${id.slice(0, 8).toUpperCase()}`

/** What rule priced a line: "12.5% desde 5", an agreed price, or the list price. */
export function appliedRuleLabel(rule: Rule | null): string {
  if (!rule) return 'Precio de lista'
  if (rule.priceCents !== null) {
    return `Precio pactado ${formatCents(rule.priceCents)} desde ${rule.minQuantity}`
  }
  return `${formatBps(rule.discountBps ?? 0)}% desde ${rule.minQuantity}`
}

export const quoteRuleLabel = appliedRuleLabel

/** "Vence en 1 h 30 min", or "Venció" once the time has passed. */
export function expiryLabel(expiresAt: Date, now: Date): string {
  const minutes = Math.floor((expiresAt.getTime() - now.getTime()) / 60_000)
  if (minutes <= 0) return 'Venció'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `Vence en ${rest} min`
  return rest ? `Vence en ${hours} h ${rest} min` : `Vence en ${hours} h`
}

import { parsePesos } from '#/modules/pricing/lib/money'
import type { PriceRow } from '#/modules/pricing/services/price-reads'

export type PriceTableRow = PriceRow & { supplierId: string | null }

/** Prices of the selected warehouse plus the warehouses the actor may switch to. */
export type PricingOverview = {
  warehouses: Array<{ id: string; name: string; canManage: boolean }>
  selectedId: string | null
  rows: Array<PriceRow>
}

export const originLabels = {
  own: 'Propio',
  derived: 'Derivado',
  none: 'Sin precio',
} as const

export function joinProducts(
  rows: ReadonlyArray<PriceRow>,
  products: ReadonlyArray<{ id: string; supplierId: string | null }>,
): Array<PriceTableRow> {
  const suppliers = new Map(products.map((p) => [p.id, p.supplierId]))
  return rows.map((row) => ({
    ...row,
    supplierId: suppliers.get(row.productId) ?? null,
  }))
}

export type ProductGroup = {
  productId: string
  productName: string
  sku: string
  category: string
  rows: Array<PriceTableRow>
}

/** Rows arrive ordered by product; consecutive rows share a group. */
export function groupByProduct(rows: ReadonlyArray<PriceTableRow>) {
  const groups = new Map<string, ProductGroup>()
  for (const row of rows) {
    const group = groups.get(row.productId) ?? {
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      category: row.category,
      rows: [],
    }
    group.rows.push(row)
    groups.set(row.productId, group)
  }
  return [...groups.values()]
}

/** Product id → its presentation prices, so each catalog card finds its own. */
export function pricesByProduct(rows: ReadonlyArray<PriceTableRow>) {
  return new Map(groupByProduct(rows).map((group) => [group.productId, group]))
}

/** Typed prices that differ from the current one, plus per-row parse errors. */
export function pendingPrices(
  rows: ReadonlyArray<PriceTableRow>,
  edits: Readonly<Record<string, string>>,
) {
  const prices: Array<{ presentationId: string; priceCents: number }> = []
  const errors: Record<string, string> = {}
  for (const row of rows) {
    const text = (edits[row.presentationId] as string | undefined)?.trim()
    if (!text) continue
    const parsed = parsePesos(text)
    if (!parsed.ok) errors[row.presentationId] = parsed.message
    else if (parsed.value !== row.priceCents || row.origin !== 'own') {
      prices.push({
        presentationId: row.presentationId,
        priceCents: parsed.value,
      })
    }
  }
  return { prices, errors }
}

/** Hint of the price input: a derived price reads as an estimate, not an own value. */
export function pricePlaceholder(row: PriceTableRow) {
  if (row.priceCents === null) return 'Sin precio'
  const pesos = (row.priceCents / 100).toFixed(2)
  return row.origin === 'derived' ? `≈ ${pesos}` : pesos
}

/** Only an own price has been set (and so recorded) in this warehouse. */
export const hasOwnPriceHistory = (row: PriceTableRow) => row.origin === 'own'

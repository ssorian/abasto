import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { PriceSuggestion } from '#/modules/pricing/services/price-suggestions'

/** Two lots of the same presentation would apply the price twice; keep the latest. */
export function uniqueByPresentation(
  suggestions: ReadonlyArray<PriceSuggestion>,
): Array<PriceSuggestion> {
  const byPresentation = new Map<string, PriceSuggestion>()
  for (const suggestion of suggestions) {
    byPresentation.delete(suggestion.presentationId)
    byPresentation.set(suggestion.presentationId, suggestion)
  }
  return [...byPresentation.values()]
}

/** Pesos text per presentation id, prefilled with the suggested price. */
export function initialPriceTexts(
  suggestions: ReadonlyArray<PriceSuggestion>,
): Record<string, string> {
  return Object.fromEntries(
    suggestions.map((item) => [
      item.presentationId,
      (item.suggestedPriceCents / 100).toFixed(2),
    ]),
  )
}

/** Apply payload: only the checked presentations, with the prices as typed. */
export function pricesFromSelection(
  suggestions: ReadonlyArray<PriceSuggestion>,
  texts: Readonly<Record<string, string>>,
  selected: ReadonlySet<string>,
): Parsed<Array<{ presentationId: string; priceCents: number }>> {
  const prices: Array<{ presentationId: string; priceCents: number }> = []
  for (const item of suggestions) {
    if (!selected.has(item.presentationId)) continue
    const parsed = parsePesosToCents(texts[item.presentationId] ?? '')
    if (!parsed.ok) return parsed
    prices.push({
      presentationId: item.presentationId,
      priceCents: parsed.value,
    })
  }
  if (!prices.length) return fail('Elige al menos un precio para aplicar.')
  return { ok: true, value: prices }
}

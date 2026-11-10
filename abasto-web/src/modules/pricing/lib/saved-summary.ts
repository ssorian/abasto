/** Single toast text for what one Prices-dialog save wrote: cost, prices, or both. */
export function savedSummary(
  costSaved: boolean,
  pricesSaved: boolean,
  priceCount: number,
): string | null {
  if (costSaved && pricesSaved) return 'Costo y precios guardados.'
  if (costSaved) return 'Costo por pieza guardado.'
  if (pricesSaved) {
    return priceCount === 1 ? 'Precio guardado.' : 'Precios guardados.'
  }
  return null
}

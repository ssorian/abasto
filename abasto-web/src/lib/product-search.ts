type Searchable = { name: string; sku: string }

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Products whose name or SKU contain every word typed (case and accent insensitive). */
export function filterProducts<T extends Searchable>(
  items: ReadonlyArray<T>,
  query: string,
): Array<T> {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return [...items]
  return items.filter((item) => {
    const haystack = normalize(`${item.name} ${item.sku}`)
    return words.every((word) => haystack.includes(word))
  })
}

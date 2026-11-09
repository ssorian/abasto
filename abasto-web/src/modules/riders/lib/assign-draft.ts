export type AssignableProduct = {
  productId: string
  name: string
  /** Base units in the product's largest active presentation ("caja"). */
  boxFactor: number
  /** Base units free to assign in the warehouse. */
  available: number
}

export type AssignDraftLine = {
  productId: string
  boxes: string
  units: string
}

export type AssignInput = {
  riderId: string
  lines: Array<{ productId: string; boxes: number; units: number }>
}

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string }

const fail = (message: string): Parsed<never> => ({ ok: false, message })

const wholeMessage =
  'Las cajas y las unidades deben ser números enteros, cero o más.'

function parseWhole(text: string): number | null {
  const clean = text.trim()
  if (clean === '') return 0
  if (!/^\d+$/.test(clean)) return null
  const value = Number(clean)
  return Number.isSafeInteger(value) ? value : null
}

/** Checks the assign form the way the server will, with friendlier copy. */
export function assignInputFromDraft(
  riderId: string,
  draft: ReadonlyArray<AssignDraftLine>,
  products: ReadonlyArray<AssignableProduct>,
): Parsed<AssignInput> {
  if (!riderId) return fail('Elige al repartidor.')
  if (!draft.length) return fail('Agrega al menos un producto al reparto.')
  if (draft.some((line) => !line.productId)) {
    return fail('Elige el producto de cada línea.')
  }
  if (new Set(draft.map((line) => line.productId)).size !== draft.length) {
    return fail('No repitas el mismo producto en el reparto.')
  }
  const lines: AssignInput['lines'] = []
  for (const line of draft) {
    const product = products.find((p) => p.productId === line.productId)
    if (!product) return fail('Elige el producto de cada línea.')
    const boxes = parseWhole(line.boxes)
    const units = parseWhole(line.units)
    if (boxes === null || units === null) return fail(wholeMessage)
    const total = boxes * product.boxFactor + units
    if (total < 1) {
      return fail(`Indica cuántas cajas o unidades de ${product.name}.`)
    }
    if (total > product.available) {
      return fail(
        `De ${product.name} solo hay ${product.available} disponibles.`,
      )
    }
    lines.push({ productId: line.productId, boxes, units })
  }
  return { ok: true, value: { riderId, lines } }
}

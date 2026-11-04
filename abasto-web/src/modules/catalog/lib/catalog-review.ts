import { formatPesos } from '#/modules/catalog/lib/catalog-money'
import { catalogPriceCents } from '#/modules/catalog/lib/catalog-presentations'
import { draftsFromProduct } from '#/modules/catalog/lib/presentation-draft'

import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

export type ReviewChange = {
  entity: string
  detail: string
  before?: string
  after?: string
}

export type CatalogReview = {
  changes: Array<ReviewChange>
  risks: Array<string>
  /** Whether the change needs a written reason before it is registered. */
  needsReason: boolean
}

/** Fields that identify what changed in an existing product, in the reference's order. */
const trackedFields: Array<
  readonly [string, (product: CatalogProduct) => unknown]
> = [
  ['price', catalogPriceCents],
  ['name', (product) => product.name],
  ['sku', (product) => product.sku],
  ['barcode', (product) => product.barcode],
  ['published', (product) => product.published],
  ['description', (product) => product.description],
  ['presentations', (product) => draftsFromProduct(product)],
  ['defaultPresentation', (product) => product.defaultPresentationId],
]

const differs = (a: unknown, b: unknown) =>
  JSON.stringify(a) !== JSON.stringify(b)

/**
 * Lists what a save changes. New products are a plain registration (the demo
 * user is an administrator); edits to an existing product are sensitive.
 * Returns undefined when nothing changed.
 */
export function reviewCatalogChange(
  previous: CatalogProduct | undefined,
  next: CatalogProduct,
): CatalogReview | undefined {
  if (!previous)
    return {
      changes: [{ entity: 'Catálogo', detail: `Alta de ${next.name}` }],
      risks: [],
      needsReason: false,
    }

  const fields = trackedFields
    .filter(([, read]) => differs(read(previous), read(next)))
    .map(([field]) => field)
  if (fields.length === 0 && !differs(previous, next)) return undefined

  const priceChanged = fields.includes('price')
  const before = formatPesos(catalogPriceCents(previous))
  const after = formatPesos(catalogPriceCents(next))
  const changes: Array<ReviewChange> = [
    {
      entity: 'Catálogo',
      detail: `${next.name} · ${fields.join(', ')}`,
      before: priceChanged ? before : undefined,
      after: priceChanged ? after : undefined,
    },
  ]
  const risks = ['Cambio de catálogo o presentaciones']

  if (priceChanged) {
    changes.push({
      entity: 'Precios',
      detail: 'Cambio de precio general en catálogo',
      before,
      after,
    })
    risks.push('Cambio de precio')
  }

  return { changes, risks, needsReason: true }
}

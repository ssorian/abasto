import type {
  CatalogProduct,
  PresentationDraft,
} from '#/modules/catalog/lib/catalog-types'
import type { PresentationSet } from '#/modules/catalog/services/presentation-rules'

/** Rows for the presentations dialog, including inactive ones. */
export const draftsFromProduct = (
  product: CatalogProduct,
): Array<PresentationDraft> =>
  product.presentations.map((presentation) => ({
    key: presentation.id,
    id: presentation.id,
    name: presentation.name,
    factor: presentation.factor,
    barcode: presentation.barcode ?? '',
    active: presentation.active,
  }))

export const newPresentationDraft = (): PresentationDraft => ({
  key: crypto.randomUUID(),
  name: '',
  factor: 1,
  barcode: '',
  active: true,
})

/** Key of the stored default presentation, if any. */
export const defaultKeyOf = (product: CatalogProduct) =>
  product.presentations.find(({ isDefault }) => isDefault)?.id ?? ''

/** Full set for `savePresentations`; the server validates it. */
export const presentationSetFromDrafts = (
  rows: ReadonlyArray<PresentationDraft>,
  defaultKey: string,
): PresentationSet => ({
  presentations: rows.map((row) => ({
    id: row.id,
    name: row.name,
    factor: row.factor,
    barcode: row.barcode.trim() || null,
    active: row.active,
  })),
  defaultIndex: rows.findIndex((row) => row.key === defaultKey),
})

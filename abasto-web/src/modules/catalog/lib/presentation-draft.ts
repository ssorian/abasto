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

/** Rows of a product being created: one active base-unit row, selected as default. */
export function initialPresentationDrafts(unit: string): {
  rows: Array<PresentationDraft>
  defaultKey: string
} {
  const base = { ...newPresentationDraft(), name: unit }
  return { rows: [base], defaultKey: base.key }
}

/** When the base unit changes, unsaved base rows still named after it follow along. */
export const renameBaseRows = (
  rows: ReadonlyArray<PresentationDraft>,
  from: string,
  to: string,
): Array<PresentationDraft> =>
  rows.map((row) =>
    !row.id && row.factor === 1 && row.name === from
      ? { ...row, name: to }
      : row,
  )

/**
 * Drops a row that was never saved. Stored rows stay (they can only be
 * deactivated). A removed default falls back to the first active row.
 */
export function removeDraft(
  rows: ReadonlyArray<PresentationDraft>,
  defaultKey: string,
  key: string,
): { rows: Array<PresentationDraft>; defaultKey: string } {
  const target = rows.find((row) => row.key === key)
  if (!target || target.id) return { rows: [...rows], defaultKey }
  const left = rows.filter((row) => row.key !== key)
  const nextDefault =
    defaultKey === key
      ? (left.find((row) => row.active)?.key ?? '')
      : defaultKey
  return { rows: left, defaultKey: nextDefault }
}

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

import { describe, expect, test } from 'bun:test'

import {
  draftsFromProduct,
  initialPresentationDrafts,
  newPresentationDraft,
  presentationSetFromDrafts,
  removeDraft,
  renameBaseRows,
} from '#/modules/catalog/lib/presentation-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

const product: CatalogProduct = {
  id: 'p1',
  sku: 'A',
  name: 'A',
  brand: '',
  description: '',
  imageUrl: null,
  category: 'Bebidas',
  unit: 'piezas',
  supplierId: null,
  supplierCode: '',
  listPricePerPiece: 0,
  fixedDiscountPerPiece: 0,
  promotionPerPiece: 0,
  published: true,
  archivedAt: null,
  createdAt: new Date(0),
  presentations: [
    {
      id: 'u',
      productId: 'p1',
      name: 'Pieza',
      factor: 1,
      barcode: null,
      active: true,
      isDefault: false,
      createdAt: new Date(0),
    },
    {
      id: 'c',
      productId: 'p1',
      name: 'Caja',
      factor: 24,
      barcode: '750',
      active: false,
      isDefault: true,
      createdAt: new Date(0),
    },
  ],
}

describe('presentation drafts ↔ savePresentations set', () => {
  test('rows come from the product with the default key selected', () => {
    const rows = draftsFromProduct(product)
    expect(
      rows.map((row) => [row.id, row.name, row.factor, row.barcode]),
    ).toEqual([
      ['u', 'Pieza', 1, ''],
      ['c', 'Caja', 24, '750'],
    ])
  })

  test('existing rows keep their id; new rows have none; default index follows the key', () => {
    const rows = [...draftsFromProduct(product), newPresentationDraft()]
    rows[2] = { ...rows[2], name: 'Six', factor: 6, barcode: ' 751 ' }
    const set = presentationSetFromDrafts(rows, rows[2].key)
    expect(set.defaultIndex).toBe(2)
    expect(set.presentations).toEqual([
      { id: 'u', name: 'Pieza', factor: 1, barcode: null, active: true },
      { id: 'c', name: 'Caja', factor: 24, barcode: '750', active: false },
      { id: undefined, name: 'Six', factor: 6, barcode: '751', active: true },
    ])
  })

  test('an unknown default key yields an out-of-range index for the server to reject', () => {
    const set = presentationSetFromDrafts(draftsFromProduct(product), 'nope')
    expect(set.defaultIndex).toBe(-1)
  })
})

describe('new product presentations', () => {
  test('starts with one active base row named after the unit, selected as default', () => {
    const initial = initialPresentationDrafts('piezas')
    expect(initial.rows).toHaveLength(1)
    expect(initial.rows[0]).toMatchObject({
      name: 'piezas',
      factor: 1,
      barcode: '',
      active: true,
    })
    expect(initial.rows[0].id).toBeUndefined()
    expect(initial.defaultKey).toBe(initial.rows[0].key)
  })

  test('renaming the unit renames only an untouched base row', () => {
    const initial = initialPresentationDrafts('piezas')
    const custom = { ...newPresentationDraft(), name: 'Caja', factor: 12 }
    const renamed = renameBaseRows([...initial.rows, custom], 'piezas', 'kilos')
    expect(renamed.map((row) => row.name)).toEqual(['kilos', 'Caja'])
  })

  test('removing an unsaved default row falls back to the first active row', () => {
    const base = newPresentationDraft()
    const extra = { ...newPresentationDraft(), name: 'Caja', factor: 12 }
    const result = removeDraft([base, extra], extra.key, extra.key)
    expect(result.rows).toEqual([base])
    expect(result.defaultKey).toBe(base.key)
  })

  test('removing another row keeps the default', () => {
    const base = newPresentationDraft()
    const extra = { ...newPresentationDraft(), name: 'Caja', factor: 12 }
    const result = removeDraft([base, extra], base.key, extra.key)
    expect(result.defaultKey).toBe(base.key)
  })

  test('stored rows are never removed, only deactivated', () => {
    const stored = draftsFromProduct(product)
    const result = removeDraft(stored, 'c', 'u')
    expect(result.rows).toEqual(stored)
    expect(result.defaultKey).toBe('c')
  })
})

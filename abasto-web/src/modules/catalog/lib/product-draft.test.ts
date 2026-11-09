import { describe, expect, test } from 'bun:test'

import {
  draftFromProduct,
  emptyProductDraft,
  productInputFromDraft,
  productPatchFromDraft,
  supplierCostErrors,
} from '#/modules/catalog/lib/product-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

const stored: CatalogProduct = {
  id: 'p1',
  sku: 'LEC-001',
  name: 'Leche entera',
  brand: 'Lala',
  description: '1 L',
  imageUrl: 'https://cdn.example.com/leche.png',
  category: 'Lácteos',
  unit: 'piezas',
  supplierId: 's1',
  supplierCode: 'ORA-77',
  listPricePerPiece: 12055,
  fixedDiscountPerPiece: 1000,
  promotionPerPiece: 500,
  published: false,
  createdAt: new Date(0),
  presentations: [],
}

describe('product draft ↔ service input', () => {
  test('a new product gets one active base presentation named after the unit', () => {
    const input = productInputFromDraft({
      ...emptyProductDraft(),
      name: 'Leche',
      sku: 'LEC-001',
      unit: 'cajas',
      barcode: ' 7500000000001 ',
      supplierId: 's1',
    })
    expect(input.presentations).toEqual([
      { name: 'cajas', factor: 1, barcode: '7500000000001', active: true },
    ])
    expect(input.defaultIndex).toBe(0)
    expect(input.supplierId).toBe('s1')
    expect(input).not.toHaveProperty('price')
    expect(input).not.toHaveProperty('min')
  })

  test('blank barcode and supplier become null', () => {
    const input = productInputFromDraft({
      ...emptyProductDraft(),
      name: 'Leche',
      sku: 'X',
    })
    expect(input.presentations[0]?.barcode).toBeNull()
    expect(input.supplierId).toBeNull()
  })

  test('the edit patch never carries unit, barcode or presentations', () => {
    const patch = productPatchFromDraft(draftFromProduct(stored))
    expect(patch).toEqual({
      name: 'Leche entera',
      sku: 'LEC-001',
      brand: 'Lala',
      description: '1 L',
      imageUrl: 'https://cdn.example.com/leche.png',
      category: 'Lácteos',
      supplierId: 's1',
      published: false,
      supplierCode: 'ORA-77',
    })
  })

  test('saving an edit never carries cost amounts, so Prices stays the source', () => {
    const patch = productPatchFromDraft(draftFromProduct(stored))
    expect(patch).not.toHaveProperty('listPricePerPiece')
    expect(patch).not.toHaveProperty('fixedDiscountPerPiece')
    expect(patch).not.toHaveProperty('promotionPerPiece')
  })

  test('a new product leaves cost amounts to the server defaults', () => {
    const input = productInputFromDraft({
      ...emptyProductDraft(),
      name: 'Leche',
      sku: 'X',
      listPrice: '2.5',
    })
    expect(input).not.toHaveProperty('listPricePerPiece')
    expect(input).not.toHaveProperty('fixedDiscountPerPiece')
    expect(input).not.toHaveProperty('promotionPerPiece')
  })

  test('a product without photo edits as an empty field; blank saves as none', () => {
    const draft = draftFromProduct({ ...stored, imageUrl: null })
    expect(draft.imageUrl).toBe('')
    expect(productPatchFromDraft(draft).imageUrl).toBeNull()
    expect(
      productInputFromDraft({ ...emptyProductDraft(), imageUrl: '   ' })
        .imageUrl,
    ).toBeNull()
    expect(
      productInputFromDraft({
        ...emptyProductDraft(),
        imageUrl: ' https://cdn.example.com/a.png ',
      }).imageUrl,
    ).toBe('https://cdn.example.com/a.png')
  })

  test('a product without supplier edits as an empty select value', () => {
    expect(draftFromProduct({ ...stored, supplierId: null }).supplierId).toBe(
      '',
    )
    expect(
      productPatchFromDraft({ ...draftFromProduct(stored), supplierId: '' })
        .supplierId,
    ).toBeNull()
  })

  test('the supplier code loads into the draft and saves with the edit', () => {
    const draft = draftFromProduct(stored)
    expect(draft.supplierCode).toBe('ORA-77')
    expect(
      productPatchFromDraft({ ...draft, supplierCode: ' X1 ' }).supplierCode,
    ).toBe(' X1 ')
  })

  test('a new draft has no supplier terms', () => {
    const empty = emptyProductDraft()
    expect(empty).toMatchObject({
      supplierCode: '',
      listPrice: '',
      fixedDiscount: '',
      promotion: '',
    })
  })
})

describe('supplier terms validation', () => {
  const draft = emptyProductDraft()

  test('accepts blank and valid amounts', () => {
    expect(supplierCostErrors(draft)).toEqual({})
    expect(
      supplierCostErrors({
        ...draft,
        listPrice: '1.5',
        fixedDiscount: '0.2',
        promotion: '0.1',
      }),
    ).toEqual({})
  })

  test('reports each field with its parse message', () => {
    expect(supplierCostErrors({ ...draft, fixedDiscount: '0.12345' })).toEqual({
      fixedDiscount: 'Usa máximo 4 decimales.',
    })
    expect(supplierCostErrors({ ...draft, promotion: '-1' })).toEqual({
      promotion: 'El monto no puede ser negativo.',
    })
    expect(supplierCostErrors({ ...draft, listPrice: '1,5' })).toEqual({
      listPrice: 'Usa punto para los decimales, sin comas.',
    })
  })

  test('discount plus promotion above the list price is reported on the discount', () => {
    const above = {
      ...draft,
      listPrice: '1',
      fixedDiscount: '0.6',
      promotion: '0.41',
    }
    expect(supplierCostErrors(above)).toEqual({
      fixedDiscount:
        'El descuento y la promoción no pueden superar el precio por pieza.',
    })
    expect(supplierCostErrors({ ...above, promotion: '0.4' })).toEqual({})
  })
})

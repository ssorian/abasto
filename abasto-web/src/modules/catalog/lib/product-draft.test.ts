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
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 500,
    })
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

  test('supplier terms show as 4-decimal pesos and save as ten-thousandths', () => {
    const draft = draftFromProduct(stored)
    expect(draft).toMatchObject({
      supplierCode: 'ORA-77',
      fixedDiscount: '0.1000',
      promotion: '0.0500',
    })
    expect(draft).not.toHaveProperty('listPrice')
    const input = productInputFromDraft({
      ...draft,
      supplierCode: 'X1',
      fixedDiscount: '',
      promotion: '0.01',
    })
    expect(input).toMatchObject({
      supplierCode: 'X1',
      fixedDiscountPerPiece: 0,
      promotionPerPiece: 100,
    })
    expect(input).not.toHaveProperty('listPricePerPiece')
    expect(productPatchFromDraft(draft)).not.toHaveProperty('listPricePerPiece')
  })

  test('a new draft has no supplier terms', () => {
    const empty = emptyProductDraft()
    expect(empty).toMatchObject({
      supplierCode: '',
      fixedDiscount: '',
      promotion: '',
    })
    expect(empty).not.toHaveProperty('listPrice')
  })
})

describe('supplier terms validation', () => {
  const draft = emptyProductDraft()

  test('accepts blank and valid amounts', () => {
    expect(supplierCostErrors(draft)).toEqual({})
    expect(
      supplierCostErrors({ ...draft, fixedDiscount: '0.2', promotion: '0.1' }),
    ).toEqual({})
  })

  test('reports each field with its parse message', () => {
    expect(supplierCostErrors({ ...draft, fixedDiscount: '0.12345' })).toEqual({
      fixedDiscount: 'Usa máximo 4 decimales.',
    })
    expect(supplierCostErrors({ ...draft, promotion: '-1' })).toEqual({
      promotion: 'El monto no puede ser negativo.',
    })
  })
})

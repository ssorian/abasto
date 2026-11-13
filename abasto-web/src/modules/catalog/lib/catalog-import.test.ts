import { describe, expect, test } from 'bun:test'

import {
  importReferenceProducts,
  importRowFromCsv,
  productInputFromImport,
} from '#/modules/catalog/lib/catalog-import'
import type { CatalogImportProduct } from '#/modules/product-import/lib/import-types'

const row: CatalogImportProduct = {
  sku: 'NUE-001',
  name: 'Producto',
  brand: 'Marca',
  description: 'Desc',
  category: 'Abarrotes',
  unit: 'piezas',
  presentation: 'Caja',
  factor: 12,
  barcode: '7500000000001',
  price: 240,
  minStock: 24,
}

describe('CSV row → createProduct input', () => {
  test('a pack row creates a base presentation plus the pack as default', () => {
    const input = productInputFromImport(row)
    expect(input).toEqual({
      sku: 'NUE-001',
      name: 'Producto',
      brand: 'Marca',
      description: 'Desc',
      category: 'Abarrotes',
      unit: 'piezas',
      published: true,
      presentations: [
        { name: 'piezas', factor: 1, barcode: null, active: true },
        { name: 'Caja', factor: 12, barcode: '7500000000001', active: true },
      ],
      defaultIndex: 1,
    })
  })

  test('a factor-1 row has a single default presentation carrying the barcode', () => {
    const input = productInputFromImport({ ...row, factor: 1, barcode: '' })
    expect(input.presentations).toEqual([
      { name: 'Caja', factor: 1, barcode: null, active: true },
    ])
    expect(input.defaultIndex).toBe(0)
  })

  test('the row carries precio_venta as cents and stock_minimo for the warehouse', () => {
    expect(importRowFromCsv(row)).toEqual({
      product: productInputFromImport(row),
      priceCents: 24000,
      minimum: 24,
    })
    expect(
      importRowFromCsv({ ...row, price: 19.9, minStock: 0 }),
    ).toMatchObject({ priceCents: 1990, minimum: 0 })
    expect(importRowFromCsv({ ...row, price: 1.15 }).priceCents).toBe(115)
  })

  test('reference products expose sku and every presentation barcode', () => {
    const [ref] = importReferenceProducts([
      {
        id: 'p',
        sku: 'S',
        name: 'N',
        brand: '',
        description: '',
        imageUrl: null,
        category: 'Bebidas',
        unit: 'cajas',
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
            id: 'x',
            productId: 'p',
            name: 'Caja',
            factor: 1,
            barcode: '123',
            active: true,
            isDefault: true,
            createdAt: new Date(0),
          },
        ],
      },
    ])
    expect(ref.sku).toBe('S')
    expect(ref.unit).toBe('cajas')
    expect(ref.barcodes).toEqual(['123'])
  })
})

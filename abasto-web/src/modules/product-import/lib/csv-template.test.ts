import { describe, expect, test } from 'bun:test'

import {
  importHeaders,
  importTemplate,
  modeBanners,
} from '#/modules/product-import/lib/csv-template'

describe('catalog import copy', () => {
  test('the template still asks for precio_venta and stock_minimo', () => {
    expect(importHeaders.catalog).toContain('precio_venta')
    expect(importHeaders.catalog).toContain('stock_minimo')
    expect(importTemplate('catalog').split('\r\n')[0]).toContain(
      'precio_venta,stock_minimo',
    )
  })

  test('the dialog no longer says precio_venta and stock_minimo are not saved', () => {
    expect(modeBanners.catalog).not.toMatch(/no se guardan/i)
    expect(modeBanners.catalog).toContain('precio_venta')
    expect(modeBanners.catalog).toContain('stock_minimo')
    expect(modeBanners.catalog).toMatch(/se guardan en el almacén/i)
  })
})

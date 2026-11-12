import { describe, expect, test } from 'bun:test'
import {
  availabilityLabel,
  buildSellable,
  countLabel,
  filterSellable,
  sellableSuppliers,
} from '#/modules/counter/lib/sellable'
import type { SellableOption } from '#/modules/counter/lib/sellable'

const price = (
  presentationId: string,
  productId: string,
  priceCents: number | null,
  factor: number,
) => ({
  presentationId,
  productId,
  productName: productId === 'm' ? 'Leche' : 'Cola',
  sku: productId === 'm' ? 'LE-1' : 'CO-1',
  presentationName: factor === 1 ? 'Pieza' : 'Caja',
  factor,
  priceCents,
})

describe('buildSellable', () => {
  test('lists priced presentations with whole presentations available', () => {
    const rows = buildSellable(
      [
        price('m1', 'm', 1000, 1),
        price('m12', 'm', 12000, 12),
        price('c1', 'c', null, 1),
      ],
      [
        {
          productId: 'm',
          available: 30,
          unit: 'piezas',
          imageUrl: 'https://example.com/leche.png',
          supplierId: 'lala',
          supplierName: 'Lala',
        },
      ],
    )
    expect(rows).toEqual([
      {
        presentationId: 'm1',
        label: 'Leche · Pieza',
        priceCents: 1000,
        available: 30,
        productId: 'm',
        factor: 1,
        availableBase: 30,
        presentationName: 'Pieza',
        unit: 'piezas',
        productName: 'Leche',
        sku: 'LE-1',
        imageUrl: 'https://example.com/leche.png',
        supplierId: 'lala',
        supplierName: 'Lala',
      },
      {
        presentationId: 'm12',
        label: 'Leche · Caja',
        priceCents: 12000,
        available: 2,
        productId: 'm',
        factor: 12,
        availableBase: 30,
        presentationName: 'Caja',
        unit: 'piezas',
        productName: 'Leche',
        sku: 'LE-1',
        imageUrl: 'https://example.com/leche.png',
        supplierId: 'lala',
        supplierName: 'Lala',
      },
    ])
  })

  test('a product without stock rows has nothing available', () => {
    expect(buildSellable([price('m1', 'm', 1000, 1)], [])[0]).toMatchObject({
      available: 0,
      imageUrl: null,
      supplierId: null,
      supplierName: null,
    })
  })
})

describe('availability in the unit being requested', () => {
  const option = (
    factor: number,
    available: number,
    availableBase: number,
  ) => ({
    presentationId: 'p',
    label: 'Leche · X',
    productId: 'm',
    factor,
    priceCents: 1,
    available,
    availableBase,
    presentationName: factor === 1 ? 'Pieza' : 'Caja',
    unit: 'piezas',
    productName: 'Leche',
    sku: 'LE-1',
    imageUrl: null,
    supplierId: null,
    supplierName: null,
  })

  test('counts with the right plural', () => {
    expect(countLabel(1, 'piezas')).toBe('1 pieza')
    expect(countLabel(0, 'piezas')).toBe('0 piezas')
    expect(countLabel(1, 'unidades')).toBe('1 unidad')
    expect(countLabel(1, 'paquetes')).toBe('1 paquete')
    expect(countLabel(3, 'unidad')).toBe('3 unidades')
    expect(countLabel(1, 'sobres')).toBe('1 sobre')
    expect(countLabel(1, 'baldes')).toBe('1 balde')
    expect(countLabel(1, 'embalajes')).toBe('1 embalaje')
    expect(countLabel(1, 'cartones')).toBe('1 cartón')
    expect(countLabel(1, 'contenedores')).toBe('1 contenedor')
    expect(countLabel(1, 'cajas')).toBe('1 caja')
    expect(countLabel(216, 'piezas')).toBe('216 piezas')
    expect(countLabel(1, 'Caja')).toBe('1 caja')
    expect(countLabel(9, 'Caja')).toBe('9 cajas')
  })

  test('a box line says boxes and the pieces behind them, not a bare number', () => {
    expect(availabilityLabel(option(24, 9, 216))).toBe(
      'Disponible: 9 cajas (216 piezas)',
    )
    expect(availabilityLabel(option(24, 1, 30))).toBe(
      'Disponible: 1 caja (30 piezas)',
    )
  })

  test('a piece line just says pieces', () => {
    expect(availabilityLabel(option(1, 216, 216))).toBe(
      'Disponible: 216 piezas',
    )
    expect(availabilityLabel(option(1, 1, 1))).toBe('Disponible: 1 pieza')
  })
})

describe('filterSellable', () => {
  const row = (
    presentationId: string,
    productName: string,
    sku: string,
    supplierId: string | null,
  ): SellableOption => ({
    presentationId,
    label: `${productName} · Pieza`,
    productId: presentationId,
    factor: 1,
    presentationName: 'Pieza',
    unit: 'piezas',
    priceCents: 1000,
    available: 5,
    availableBase: 5,
    productName,
    sku,
    imageUrl: null,
    supplierId,
    supplierName: supplierId === 'lala' ? 'Lala' : supplierId && 'Alpura',
  })
  const options = [
    row('a', 'Leche Lala 1L', 'LA-01', 'lala'),
    row('b', 'Alpura Fresa 250 ml', 'FT02', 'alpura'),
    row('c', 'Café Lechero', 'SA43', 'alpura'),
    row('d', 'Agua', 'AG-1', null),
  ]
  const ids = (rows: ReadonlyArray<SellableOption>) =>
    rows.map((option) => option.presentationId)

  test('with no filter lists every option', () => {
    expect(ids(filterSellable(options, { query: '', supplierId: '' }))).toEqual(
      ['a', 'b', 'c', 'd'],
    )
  })

  test('searches by name or SKU, ignoring case and accents', () => {
    expect(
      ids(filterSellable(options, { query: 'cafe', supplierId: '' })),
    ).toEqual(['c'])
    expect(
      ids(filterSellable(options, { query: 'ft0', supplierId: '' })),
    ).toEqual(['b'])
  })

  test('keeps only the chosen supplier', () => {
    expect(
      ids(filterSellable(options, { query: '', supplierId: 'alpura' })),
    ).toEqual(['b', 'c'])
    expect(
      ids(filterSellable(options, { query: 'leche', supplierId: 'alpura' })),
    ).toEqual(['c'])
  })

  test('only added keeps the presentations already in the order', () => {
    expect(
      ids(
        filterSellable(options, {
          query: '',
          supplierId: '',
          onlyIds: new Set(['d', 'b']),
        }),
      ),
    ).toEqual(['b', 'd'])
  })
})

describe('sellableSuppliers', () => {
  test('lists each supplier once, by name', () => {
    const option = (supplierId: string | null, supplierName: string | null) =>
      ({ supplierId, supplierName }) as SellableOption
    expect(
      sellableSuppliers([
        option('lala', 'Lala'),
        option('alpura', 'Alpura'),
        option('lala', 'Lala'),
        option(null, null),
      ]),
    ).toEqual([
      { id: 'alpura', name: 'Alpura', active: true },
      { id: 'lala', name: 'Lala', active: true },
    ])
  })
})

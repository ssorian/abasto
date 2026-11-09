import { describe, expect, test } from 'bun:test'

import { assignInputFromDraft } from './assign-draft'
import type { AssignableProduct } from './assign-draft'

const products: Array<AssignableProduct> = [
  { productId: 'p1', name: 'Leche', boxFactor: 12, available: 100 },
  { productId: 'p2', name: 'Queso', boxFactor: 1, available: 5 },
]

describe('assignInputFromDraft', () => {
  test('turns typed boxes and units into the server input', () => {
    const parsed = assignInputFromDraft(
      'r1',
      [
        { productId: 'p1', boxes: '4', units: '2' },
        { productId: 'p2', boxes: '', units: '3' },
      ],
      products,
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        riderId: 'r1',
        lines: [
          { productId: 'p1', boxes: 4, units: 2 },
          { productId: 'p2', boxes: 0, units: 3 },
        ],
      },
    })
  })

  test('asks for a rider and at least one product', () => {
    expect(assignInputFromDraft('', [], products)).toEqual({
      ok: false,
      message: 'Elige al repartidor.',
    })
    expect(assignInputFromDraft('r1', [], products)).toEqual({
      ok: false,
      message: 'Agrega al menos un producto al reparto.',
    })
  })

  test('refuses an unchosen product, a repeated one and an empty quantity', () => {
    expect(
      assignInputFromDraft(
        'r1',
        [{ productId: '', boxes: '1', units: '' }],
        products,
      ),
    ).toEqual({ ok: false, message: 'Elige el producto de cada línea.' })
    expect(
      assignInputFromDraft(
        'r1',
        [
          { productId: 'p1', boxes: '1', units: '' },
          { productId: 'p1', boxes: '', units: '1' },
        ],
        products,
      ),
    ).toEqual({
      ok: false,
      message: 'No repitas el mismo producto en el reparto.',
    })
    expect(
      assignInputFromDraft(
        'r1',
        [{ productId: 'p1', boxes: '0', units: '' }],
        products,
      ),
    ).toEqual({
      ok: false,
      message: 'Indica cuántas cajas o unidades de Leche.',
    })
  })

  test('refuses malformed numbers and more than is available', () => {
    expect(
      assignInputFromDraft(
        'r1',
        [{ productId: 'p1', boxes: '1.5', units: '' }],
        products,
      ),
    ).toEqual({
      ok: false,
      message:
        'Las cajas y las unidades deben ser números enteros, cero o más.',
    })
    expect(
      assignInputFromDraft(
        'r1',
        [{ productId: 'p2', boxes: '', units: '6' }],
        products,
      ),
    ).toEqual({ ok: false, message: 'De Queso solo hay 5 disponibles.' })
    // 9 boxes of 12 = 108 > 100
    expect(
      assignInputFromDraft(
        'r1',
        [{ productId: 'p1', boxes: '9', units: '' }],
        products,
      ),
    ).toEqual({ ok: false, message: 'De Leche solo hay 100 disponibles.' })
  })
})

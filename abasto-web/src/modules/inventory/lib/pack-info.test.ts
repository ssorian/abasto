import { describe, expect, test } from 'bun:test'
import {
  movementLabel,
  packInfoOf,
  quantityPresentations,
} from '#/modules/inventory/lib/pack-info'

const product = {
  unit: 'piezas',
  presentations: [
    { id: 'a', name: 'piezas', factor: 1, active: true, isDefault: false },
    { id: 'b', name: 'cajas', factor: 24, active: true, isDefault: true },
    { id: 'c', name: 'tarimas', factor: 480, active: false, isDefault: false },
  ],
}

describe('packInfoOf', () => {
  test('uses the default presentation', () => {
    expect(packInfoOf(product)).toEqual({
      packName: 'cajas',
      factor: 24,
      unit: 'piezas',
    })
  })

  test('falls back to the base unit without an active default', () => {
    expect(
      packInfoOf({
        unit: 'piezas',
        presentations: [
          {
            id: 'c',
            name: 'tarimas',
            factor: 480,
            active: false,
            isDefault: true,
          },
        ],
      }),
    ).toEqual({ packName: 'piezas', factor: 1, unit: 'piezas' })
  })
})

describe('quantityPresentations', () => {
  test('lists only active presentations, default first', () => {
    expect(quantityPresentations(product).map((item) => item.id)).toEqual([
      'b',
      'a',
    ])
  })
})

describe('movementLabel', () => {
  test('labels every ledger type in Spanish', () => {
    expect(movementLabel('purchase')).toBe('Entrada por compra')
    expect(movementLabel('adjustment')).toBe('Ajuste')
    expect(movementLabel('loss')).toBe('Pérdida')
    expect(movementLabel('count')).toBe('Conteo')
    expect(movementLabel('sale')).toBe('Venta')
    expect(movementLabel('transfer_out')).toBe('Salida por traslado')
    expect(movementLabel('transfer_in')).toBe('Entrada por traslado')
    expect(movementLabel('transfer_return')).toBe('Traslado cancelado')
  })
})

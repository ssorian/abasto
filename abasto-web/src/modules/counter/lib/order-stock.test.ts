import { describe, expect, test } from 'bun:test'
import {
  findStockShortages,
  stockShortageMessage,
} from '#/modules/counter/lib/order-stock'

const caja = {
  presentationId: 'caja',
  productId: 'leche',
  factor: 12,
  availableBase: 72,
  unit: 'piezas',
}
const pieza = {
  presentationId: 'pieza',
  productId: 'leche',
  factor: 1,
  availableBase: 72,
  unit: 'piezas',
}
const otro = {
  presentationId: 'otro',
  productId: 'cola',
  factor: 1,
  availableBase: 3,
  unit: 'piezas',
}
const optionOf = (...options: Array<typeof caja>) =>
  new Map(options.map((option) => [option.presentationId, option]))

describe('findStockShortages', () => {
  test('6 Caja + 5 Pieza (77) exceeds 72 base units on both lines', () => {
    const result = findStockShortages(
      [
        { presentationId: 'caja', quantity: '6' },
        { presentationId: 'pieza', quantity: '5' },
      ],
      optionOf(caja, pieza),
    )
    expect(result.get('caja')).toEqual({
      requested: 77,
      available: 72,
      unit: 'piezas',
    })
    expect(result.get('pieza')).toEqual({
      requested: 77,
      available: 72,
      unit: 'piezas',
    })
  })

  test('exactly the available base units is fine', () => {
    const result = findStockShortages(
      [
        { presentationId: 'caja', quantity: '5' },
        { presentationId: 'pieza', quantity: '12' },
      ],
      optionOf(caja, pieza),
    )
    expect(result.size).toBe(0)
  })

  test('products are checked independently', () => {
    const result = findStockShortages(
      [
        { presentationId: 'caja', quantity: '1' },
        { presentationId: 'otro', quantity: '4' },
      ],
      optionOf(caja, otro),
    )
    expect(result.has('caja')).toBe(false)
    expect(result.get('otro')).toEqual({
      requested: 4,
      available: 3,
      unit: 'piezas',
    })
  })

  test('invalid or empty quantities count as zero and unknown lines are skipped', () => {
    const result = findStockShortages(
      [
        { presentationId: 'caja', quantity: '' },
        { presentationId: 'pieza', quantity: 'abc' },
        { presentationId: 'fantasma', quantity: '999' },
      ],
      optionOf(caja, pieza),
    )
    expect(result.size).toBe(0)
  })
})

describe('stockShortageMessage', () => {
  test('uses the right plural of the product unit', () => {
    expect(
      stockShortageMessage({ requested: 1, available: 0, unit: 'piezas' }),
    ).toBe('Pides 1 pieza en total y solo hay 0 piezas disponibles.')
    expect(
      stockShortageMessage({ requested: 5, available: 1, unit: 'piezas' }),
    ).toBe('Pides 5 piezas en total y solo hay 1 pieza disponible.')
  })

  test('explains the total against what is available in pieces', () => {
    expect(
      stockShortageMessage({ requested: 77, available: 72, unit: 'piezas' }),
    ).toBe('Pides 77 piezas en total y solo hay 72 piezas disponibles.')
  })
})

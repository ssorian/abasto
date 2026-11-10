import { describe, expect, test } from 'bun:test'
import {
  formatQuantity,
  parseWholeNumber,
  splitBaseUnits,
  toBaseUnits,
} from '#/modules/inventory/lib/quantity'

describe('parseWholeNumber', () => {
  test('blank counts as zero and digits parse', () => {
    expect(parseWholeNumber('')).toEqual({ ok: true, value: 0 })
    expect(parseWholeNumber(' 12 ')).toEqual({ ok: true, value: 12 })
  })

  test('rejects decimals, signs and text', () => {
    for (const text of ['1.5', '-2', '+3', '1e3', 'abc', '1,000']) {
      expect(parseWholeNumber(text).ok).toBe(false)
    }
  })
})

describe('toBaseUnits', () => {
  test('converts packs plus loose units to base units', () => {
    expect(toBaseUnits({ packs: '3', factor: 24, loose: '5' })).toEqual({
      ok: true,
      value: 77,
    })
    expect(toBaseUnits({ packs: '', factor: 24, loose: '7' })).toEqual({
      ok: true,
      value: 7,
    })
  })

  test('rejects zero unless allowed', () => {
    const zero = toBaseUnits({ packs: '0', factor: 24, loose: '' })
    expect(zero).toEqual({
      ok: false,
      message: 'La cantidad debe ser mayor que cero.',
    })
    expect(
      toBaseUnits({ packs: '0', factor: 24, loose: '' }, { allowZero: true }),
    ).toEqual({ ok: true, value: 0 })
  })

  test('rejects quantities above the database limit', () => {
    const result = toBaseUnits({ packs: '2147483647', factor: 24, loose: '' })
    expect(result).toEqual({
      ok: false,
      message: 'La cantidad es demasiado grande.',
    })
    expect(toBaseUnits({ packs: '1', factor: 2147483647, loose: '1' }).ok).toBe(
      false,
    )
    expect(toBaseUnits({ packs: '', factor: 1, loose: '2147483647' }).ok).toBe(
      true,
    )
  })

  test('rejects decimals in either field', () => {
    expect(toBaseUnits({ packs: '1.5', factor: 12, loose: '' }).ok).toBe(false)
    expect(toBaseUnits({ packs: '1', factor: 12, loose: '0.5' }).ok).toBe(false)
  })
})

describe('splitBaseUnits and formatQuantity', () => {
  test('splits into whole packs and loose units', () => {
    expect(splitBaseUnits(77, 24)).toEqual({ packs: 3, loose: 5 })
    expect(splitBaseUnits(5, 1)).toEqual({ packs: 5, loose: 0 })
  })

  const pack = { packName: 'cajas', factor: 24, unit: 'piezas' }

  test('formats with packs and loose units', () => {
    expect(formatQuantity(77, pack)).toBe('3 cajas + 5 piezas')
    expect(formatQuantity(48, pack)).toBe('2 cajas')
    expect(formatQuantity(5, pack)).toBe('5 piezas')
    expect(formatQuantity(0, pack)).toBe('0 piezas')
    expect(
      formatQuantity(9, { packName: 'piezas', factor: 1, unit: 'piezas' }),
    ).toBe('9 piezas')
  })

  test('uses lowercase singular or plural for presentation names', () => {
    const box = { packName: 'Caja', factor: 24, unit: 'piezas' }
    expect(formatQuantity(144, box)).toBe('6 cajas')
    expect(formatQuantity(24, box)).toBe('1 caja')
    expect(formatQuantity(25, box)).toBe('1 caja + 1 pieza')
    const pack6 = { packName: 'Paquete', factor: 6, unit: 'piezas' }
    expect(formatQuantity(12, pack6)).toBe('2 paquetes')
  })

  test('formats negative quantities with a minus sign', () => {
    expect(formatQuantity(-30, pack)).toBe('−1 caja + 6 piezas')
  })
})

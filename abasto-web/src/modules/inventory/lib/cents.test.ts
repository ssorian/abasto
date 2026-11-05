import { describe, expect, test } from 'bun:test'
import { parsePesosToCents } from '#/modules/inventory/lib/cents'

describe('parsePesosToCents', () => {
  test('converts pesos to integer cents without float drift', () => {
    const cases: Array<[string, number]> = [
      ['438', 43800],
      ['438.5', 43850],
      ['438.50', 43850],
      ['0.07', 7],
      ['19.99', 1999],
      ['1.15', 115],
      ['$ 8.2', 820],
    ]
    for (const [text, cents] of cases) {
      expect(parsePesosToCents(text)).toEqual({ ok: true, value: cents })
    }
  })

  test('rejects more than two decimals', () => {
    expect(parsePesosToCents('10.005')).toEqual({
      ok: false,
      message: 'Usa máximo 2 decimales.',
    })
  })

  test('rejects blank, negative, commas and text', () => {
    expect(parsePesosToCents('').ok).toBe(false)
    expect(parsePesosToCents('-5').ok).toBe(false)
    expect(parsePesosToCents('1,5').ok).toBe(false)
    expect(parsePesosToCents('abc').ok).toBe(false)
    expect(parsePesosToCents('1.').ok).toBe(false)
  })

  test('zero is only valid when allowed', () => {
    expect(parsePesosToCents('0').ok).toBe(false)
    expect(parsePesosToCents('0.00', { allowZero: true })).toEqual({
      ok: true,
      value: 0,
    })
  })

  test('rejects amounts above the cents limit', () => {
    expect(parsePesosToCents('21474836.47').ok).toBe(true)
    expect(parsePesosToCents('21474836.48')).toEqual({
      ok: false,
      message: 'El monto es demasiado grande.',
    })
  })
})

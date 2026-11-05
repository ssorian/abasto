import { describe, expect, test } from 'bun:test'
import {
  formatCents,
  formatBps,
  parseBps,
  parsePesos,
  parseSignedPesos,
} from '#/modules/pricing/lib/money'

describe('parsePesos', () => {
  test('converts pesos to integer cents without float drift', () => {
    expect(parsePesos('438.00')).toEqual({ ok: true, value: 43800 })
    expect(parsePesos('0.1')).toEqual({ ok: true, value: 10 })
    expect(parsePesos('1.15')).toEqual({ ok: true, value: 115 })
    expect(parsePesos('$ 19')).toEqual({ ok: true, value: 1900 })
    expect(parsePesos('0.29')).toEqual({ ok: true, value: 29 })
  })

  test('rejects more than two decimals, commas, blanks, negatives and zero', () => {
    expect(parsePesos('1.005')).toEqual({
      ok: false,
      message: 'Usa máximo 2 decimales.',
    })
    expect(parsePesos('1,5')).toEqual({
      ok: false,
      message: 'Usa punto para los decimales, sin comas.',
    })
    expect(parsePesos(' ').ok).toBe(false)
    expect(parsePesos('abc').ok).toBe(false)
    expect(parsePesos('-3').ok).toBe(false)
    expect(parsePesos('0')).toEqual({
      ok: false,
      message: 'El precio debe ser mayor que cero.',
    })
    expect(parsePesos('99999999999').ok).toBe(false)
  })
})

describe('parseSignedPesos', () => {
  test('accepts a sign and converts to signed cents', () => {
    expect(parseSignedPesos('-2.50')).toEqual({ ok: true, value: -250 })
    expect(parseSignedPesos('+3')).toEqual({ ok: true, value: 300 })
    expect(parseSignedPesos('1.234').ok).toBe(false)
  })
})

describe('parseBps', () => {
  test('converts percent to basis points', () => {
    expect(parseBps('5')).toEqual({ ok: true, value: 500 })
    expect(parseBps('-10')).toEqual({ ok: true, value: -1000 })
    expect(parseBps('12.5%')).toEqual({ ok: true, value: 1250 })
    expect(parseBps('0.07')).toEqual({ ok: true, value: 7 })
    expect(parseBps('1.234')).toEqual({
      ok: false,
      message: 'Usa máximo 2 decimales en el porcentaje.',
    })
  })
})

describe('formatting', () => {
  test('formats cents as MXN and bps as percent', () => {
    expect(formatCents(43800)).toContain('438.00')
    expect(formatBps(1250)).toBe('12.5')
    expect(formatBps(0)).toBe('0')
  })
})

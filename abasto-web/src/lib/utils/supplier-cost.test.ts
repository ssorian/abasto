import { describe, expect, test } from 'bun:test'

import {
  formatTenThousandths,
  netCostPerBoxCents,
  netCostPerPiece,
  parseTenThousandths,
} from '#/lib/utils/supplier-cost'

describe('parseTenThousandths', () => {
  test('parses pesos with up to 4 decimals into ten-thousandths', () => {
    expect(parseTenThousandths('0.0840')).toEqual({ ok: true, value: 840 })
    expect(parseTenThousandths('1.2055')).toEqual({ ok: true, value: 12055 })
    expect(parseTenThousandths(' $12 ')).toEqual({ ok: true, value: 120000 })
    expect(parseTenThousandths('0.5')).toEqual({ ok: true, value: 5000 })
  })

  test('blank means zero', () => {
    expect(parseTenThousandths('')).toEqual({ ok: true, value: 0 })
    expect(parseTenThousandths('  ')).toEqual({ ok: true, value: 0 })
  })

  test('rejects bad input with a Spanish message', () => {
    expect(parseTenThousandths('1.23456')).toEqual({
      ok: false,
      message: 'Usa máximo 4 decimales.',
    })
    expect(parseTenThousandths('-1')).toEqual({
      ok: false,
      message: 'El monto no puede ser negativo.',
    })
    expect(parseTenThousandths('1,5')).toEqual({
      ok: false,
      message: 'Usa punto para los decimales, sin comas.',
    })
    expect(parseTenThousandths('abc')).toEqual({
      ok: false,
      message: 'Escribe solo números, por ejemplo 12.5000.',
    })
    expect(parseTenThousandths('999999999')).toEqual({
      ok: false,
      message: 'El monto es demasiado grande.',
    })
  })
})

describe('formatTenThousandths', () => {
  test('always shows 4 decimals', () => {
    expect(formatTenThousandths(840)).toBe('0.0840')
    expect(formatTenThousandths(12055)).toBe('1.2055')
    expect(formatTenThousandths(0)).toBe('0.0000')
    expect(formatTenThousandths(120000)).toBe('12.0000')
  })
})

describe('net cost', () => {
  test('per piece is list minus discount minus promotion', () => {
    expect(netCostPerPiece(12055, 1000, 500)).toBe(10555)
    expect(netCostPerPiece(12055, 0, 0)).toBe(12055)
  })

  test('per box is rounded to cents, half up', () => {
    // 10555 × 12 = 126660 → 12.666 pesos → 1267 cents
    expect(netCostPerBoxCents(10555, 12)).toBe(1267)
    // 50 × 1 = 50 → exactly half a cent → rounds up
    expect(netCostPerBoxCents(50, 1)).toBe(1)
    expect(netCostPerBoxCents(49, 1)).toBe(0)
    expect(netCostPerBoxCents(0, 24)).toBe(0)
    expect(netCostPerBoxCents(840, 24)).toBe(202) // 20160 → 2.016 pesos
  })
})

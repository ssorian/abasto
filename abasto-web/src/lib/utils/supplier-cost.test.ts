import { describe, expect, test } from 'bun:test'

import {
  formatTenThousandths,
  listPricePerPieceOf,
  netCostPerBoxCents,
  netCostPerPiece,
  netLineCents,
  netPerBoxOfLineCents,
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

describe('gross line cost breakdown', () => {
  // Factor 12, 192 boxes, discount 0.08 + promotion 2.28 per piece, gross 77000.00.
  const quantity = 12 * 192
  const gross = 7_700_000

  test('worked example: list 33.4201, net line 71562.56, net per box 372.72', () => {
    const list = listPricePerPieceOf(gross, quantity)
    expect(list).toBe(334201)
    expect(formatTenThousandths(list)).toBe('33.4201')
    const net = netLineCents(gross, quantity, 800, 22800)
    expect(net).toBe(7_156_256)
    expect(netPerBoxOfLineCents(net, 192)).toBe(37272)
  })

  test('list price per piece rounds half up in ten-thousandths', () => {
    // 0.01 peso over 4 pieces = 0.0025 exactly; over 8 pieces = 0.00125 → 13 (half up).
    expect(listPricePerPieceOf(1, 4)).toBe(25)
    expect(listPricePerPieceOf(1, 8)).toBe(13)
    expect(listPricePerPieceOf(0, 8)).toBe(0)
    expect(listPricePerPieceOf(100, 0)).toBe(0)
  })

  test('net line rounds the discount once, half up, and can go negative', () => {
    // 3 pieces × 0.0050 = 0.0150 → 1.5 cents → 2.
    expect(netLineCents(100, 3, 50, 0)).toBe(98)
    expect(netLineCents(100, 3, 25, 25)).toBe(98)
    expect(netLineCents(1, 3, 50, 0)).toBe(-1)
  })

  test('net per box divides the net line by the boxes, half up', () => {
    expect(netPerBoxOfLineCents(5, 2)).toBe(3)
    expect(netPerBoxOfLineCents(4, 3)).toBe(1)
    expect(netPerBoxOfLineCents(100, 0)).toBe(0)
  })
})

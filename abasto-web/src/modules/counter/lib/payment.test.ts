import { describe, expect, test } from 'bun:test'
import {
  changeFor,
  contadoPayment,
  quickCashAmounts,
  receiptLines,
} from '#/modules/counter/lib/payment'

describe('changeFor', () => {
  test('change is tendered minus total, in integer cents', () => {
    expect(changeFor(43850, '500')).toEqual({
      ok: true,
      value: { tenderedCents: 50000, changeCents: 6150 },
    })
    expect(changeFor(1000, '10.00')).toEqual({
      ok: true,
      value: { tenderedCents: 1000, changeCents: 0 },
    })
  })

  test('tendered cash that does not cover the total says how much is missing', () => {
    expect(changeFor(1000, '9.50')).toEqual({
      ok: false,
      message: 'Faltan $0.50 para cubrir el total.',
    })
  })

  test('blank or malformed amounts are refused with the pesos message', () => {
    expect(changeFor(1000, '').ok).toBe(false)
    expect(changeFor(1000, '1,000').ok).toBe(false)
    expect(changeFor(1000, '10.999').ok).toBe(false)
  })
})

describe('contadoPayment', () => {
  test('builds the pickup input shape in cents', () => {
    expect(contadoPayment(1000, '20')).toEqual({
      ok: true,
      value: { terms: 'contado', tenderedCents: 2000 },
    })
    expect(contadoPayment(1000, '5').ok).toBe(false)
  })
})

describe('receiptLines', () => {
  test('cash shows total, tendered and change', () => {
    expect(
      receiptLines(1000, {
        terms: 'contado',
        tenderedCents: 2000,
        changeCents: 1000,
      }),
    ).toEqual([
      ['Total', '$10.00'],
      ['Efectivo recibido', '$20.00'],
      ['Cambio', '$10.00'],
    ])
  })
})

describe('quickCashAmounts', () => {
  test('exact total first, then the next round amounts above it', () => {
    expect(quickCashAmounts(52400)).toEqual([
      { label: 'Exacto', cents: 52400 },
      { label: '$550', cents: 55000 },
      { label: '$600', cents: 60000 },
      { label: '$1,000', cents: 100000 },
    ])
  })

  test('small totals offer small round amounts, never duplicates', () => {
    expect(quickCashAmounts(2000).map((a) => a.cents)).toEqual([
      2000, 5000, 10000, 50000,
    ])
  })

  test('a total already on a round amount does not repeat it', () => {
    expect(quickCashAmounts(55000).map((a) => a.cents)).toEqual([
      55000, 60000, 100000,
    ])
  })

  test('cents are rounded up to a whole peso step', () => {
    expect(quickCashAmounts(1050).map((a) => a.cents)).toEqual([
      1050, 5000, 10000, 50000,
    ])
  })
})

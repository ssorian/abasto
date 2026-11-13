import { describe, expect, test } from 'bun:test'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  countedCash,
  differenceLabel,
  differenceTone,
  lastCloseHint,
  phoneSummaryLine,
  movementLabel,
  summarizeSession,
} from '#/modules/cash/lib/cash-summary'

describe('summarizeSession', () => {
  test('groups the drawer movements (legacy abonos count as cash in) and adds up the expected cash', () => {
    const summary = summarizeSession(50000, [
      { type: 'sale', amountCents: 12000 },
      { type: 'sale', amountCents: 3000 },
      { type: 'abono', amountCents: 5000 },
      { type: 'entry', amountCents: 10000 },
      { type: 'withdrawal', amountCents: -4000 },
    ])
    expect(summary).toEqual({
      openingCents: 50000,
      salesCents: 15000,
      entriesCents: 15000,
      withdrawalsCents: 4000,
      riderDifferenceCents: 0,
      expectedCents: 76000,
    })
  })

  test('a rider shortage stays out of sales but counts in the expected cash', () => {
    const summary = summarizeSession(0, [
      { type: 'sale', amountCents: 23041 },
      { type: 'rider_difference', amountCents: -3041 },
    ])
    expect(summary).toMatchObject({
      salesCents: 23041,
      riderDifferenceCents: -3041,
      expectedCents: 20000,
    })
  })

  test('no withdrawals is a plain zero, shown as $0.00 and never -$0.00', () => {
    const { withdrawalsCents } = summarizeSession(2500, [
      { type: 'sale', amountCents: 1000 },
    ])
    expect(Object.is(withdrawalsCents, 0)).toBe(true)
    expect(formatCents(withdrawalsCents)).toBe('$0.00')
  })

  test('an empty drawer expects only the opening cash', () => {
    expect(summarizeSession(2500, []).expectedCents).toBe(2500)
  })
})

describe('differenceLabel', () => {
  test('says whether cash is missing, left over or exact', () => {
    expect(differenceLabel(0)).toBe('Cuadra')
    expect(differenceLabel(-1550)).toBe(`Faltan ${'$15.50'}`)
    expect(differenceLabel(200)).toBe('Sobran $2.00')
  })
})

describe('countedCash', () => {
  test('parses the counted pesos into cents, without any expected cash', () => {
    expect(countedCash('755.00')).toEqual({ ok: true, value: 75500 })
  })

  test('zero counted cash is allowed; garbage is not', () => {
    expect(countedCash('0')).toEqual({ ok: true, value: 0 })
    expect(countedCash('abc').ok).toBe(false)
    expect(countedCash('').ok).toBe(false)
    expect(countedCash('1.234').ok).toBe(false)
  })
})

describe('movementLabel', () => {
  test('names every movement type in Spanish', () => {
    expect(movementLabel('sale', 100)).toBe('Venta')
    expect(movementLabel('abono', 100)).toBe('Entrada')
    expect(movementLabel('entry', 100)).toBe('Entrada')
    expect(movementLabel('withdrawal', -100)).toBe('Retiro')
    expect(movementLabel('rider_difference', -3041)).toBe('Faltante de reparto')
    expect(movementLabel('rider_difference', 500)).toBe('Sobrante de reparto')
  })
})

describe('differenceTone', () => {
  test('shortage is danger, surplus is positive, exact is neutral', () => {
    expect(differenceTone(-1)).toBe('short')
    expect(differenceTone(1)).toBe('over')
    expect(differenceTone(0)).toBe('even')
  })
})

describe('lastCloseHint', () => {
  test('names the last counted cash, or nothing when there is no close', () => {
    expect(lastCloseHint(100000)).toBe('El último cierre contó $1,000.00')
    expect(lastCloseHint(null)).toBeUndefined()
  })
})

describe('phoneSummaryLine', () => {
  test('reads the open drawer with the expected cash', () => {
    expect(phoneSummaryLine(52400)).toBe(
      `Caja abierta · ${formatCents(52400)} esperado`,
    )
  })
})

import { describe, expect, test } from 'bun:test'
import {
  closePreview,
  differenceLabel,
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
      expectedCents: 76000,
    })
  })

  test('an empty drawer expects only the opening cash', () => {
    expect(summarizeSession(2500, []).expectedCents).toBe(2500)
  })
})

describe('differenceLabel', () => {
  test('says whether cash is missing, left over or exact', () => {
    expect(differenceLabel(0)).toBe('Sin diferencia')
    expect(differenceLabel(-1550)).toBe(`Faltan ${'$15.50'}`)
    expect(differenceLabel(200)).toBe('Sobran $2.00')
  })
})

describe('closePreview', () => {
  test('parses the counted pesos and shows the difference with the expected cash', () => {
    expect(closePreview(76000, '755.00')).toEqual({
      ok: true,
      value: { countedCents: 75500, differenceCents: -500 },
    })
  })

  test('zero counted cash is allowed; garbage is not', () => {
    expect(closePreview(100, '0')).toEqual({
      ok: true,
      value: { countedCents: 0, differenceCents: -100 },
    })
    expect(closePreview(100, 'abc').ok).toBe(false)
    expect(closePreview(100, '').ok).toBe(false)
    expect(closePreview(100, '1.234').ok).toBe(false)
  })
})

describe('movementLabel', () => {
  test('names every movement type in Spanish', () => {
    expect(movementLabel('sale')).toBe('Venta')
    expect(movementLabel('abono')).toBe('Entrada')
    expect(movementLabel('entry')).toBe('Entrada')
    expect(movementLabel('withdrawal')).toBe('Retiro')
  })
})

import { describe, expect, test } from 'bun:test'
import {
  appliedRuleLabel,
  expiryLabel,
  orderCode,
  quoteRuleLabel,
} from '#/modules/counter/lib/order-format'

describe('order format', () => {
  test('order code is a short upper-case prefix of the id', () => {
    expect(orderCode('3f2a9c1e-aaaa-bbbb-cccc-000000000000')).toBe(
      'PED-3F2A9C1E',
    )
  })

  test('applied rule shows discount, agreed price or nothing', () => {
    expect(appliedRuleLabel(null)).toBe('Precio de lista')
    expect(
      appliedRuleLabel({ minQuantity: 5, discountBps: 1250, priceCents: null }),
    ).toBe('12.5% desde 5')
    expect(
      appliedRuleLabel({
        minQuantity: 1,
        discountBps: null,
        priceCents: 43850,
      }),
    ).toBe('Precio pactado $438.50 desde 1')
  })

  test('quote rule label mirrors the applied one', () => {
    expect(quoteRuleLabel(null)).toBe('Precio de lista')
    expect(
      quoteRuleLabel({ minQuantity: 10, discountBps: 500, priceCents: null }),
    ).toBe('5% desde 10')
  })

  test('expiry label counts hours and minutes, or says it is over', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    expect(expiryLabel(new Date('2026-01-11T12:00:00Z'), now)).toBe(
      'Vence en 24 h',
    )
    expect(expiryLabel(new Date('2026-01-10T13:30:00Z'), now)).toBe(
      'Vence en 1 h 30 min',
    )
    expect(expiryLabel(new Date('2026-01-10T12:20:00Z'), now)).toBe(
      'Vence en 20 min',
    )
    expect(expiryLabel(new Date('2026-01-10T11:00:00Z'), now)).toBe('Venció')
  })
})

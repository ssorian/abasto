import { describe, expect, test } from 'bun:test'
import {
  discountIssue,
  discountsInput,
  discountTotalCents,
  orderTotalsText,
  payableCents,
  toggleDiscount,
} from '#/modules/inventory/lib/order-discounts'

const open = [
  { pendingId: 'a', owedValueCents: 10_000 },
  { pendingId: 'b', owedValueCents: 2_550 },
]

describe('toggleDiscount', () => {
  test('adds a balance and takes it out again', () => {
    expect(toggleDiscount([], 'a')).toEqual(['a'])
    expect(toggleDiscount(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('discountTotalCents', () => {
  test('adds the value of the chosen balances only', () => {
    expect(discountTotalCents(open, ['a', 'b'])).toBe(12_550)
    expect(discountTotalCents(open, ['b'])).toBe(2_550)
    expect(discountTotalCents(open, [])).toBe(0)
    expect(discountTotalCents(open, ['gone'])).toBe(0)
  })
})

describe('payableCents', () => {
  test('is net − discounts', () => {
    expect(payableCents(50_000, 12_550)).toBe(37_450)
  })
})

describe('discountIssue', () => {
  test('is null while discounts fit in the net total', () => {
    expect(discountIssue(10_000, 10_000)).toBeNull()
  })

  test('uses the server message when they exceed it', () => {
    expect(discountIssue(10_000, 10_001)).toBe(
      'Los descuentos no pueden superar el total del pedido.',
    )
  })
})

describe('discountsInput', () => {
  test('is the chosen balances as pending ids, nothing when none', () => {
    expect(discountsInput(['a', 'b'])).toEqual([
      { pendingId: 'a' },
      { pendingId: 'b' },
    ])
    expect(discountsInput([])).toBeUndefined()
  })
})

describe('orderTotalsText', () => {
  test('without discounts shows only the net total', () => {
    expect(orderTotalsText(50_000, 0)).toBe('Total del pedido (neto): $500.00')
  })

  test('with discounts shows net − discounts = to pay', () => {
    expect(orderTotalsText(50_000, 12_550)).toBe(
      'Total neto $500.00 − Descuentos por faltantes $125.50 = A pagar $374.50',
    )
  })
})

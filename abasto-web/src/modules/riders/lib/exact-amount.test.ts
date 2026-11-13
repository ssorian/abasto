import { describe, expect, test } from 'bun:test'
import { exactAmountText } from '#/modules/riders/lib/exact-amount'
import { parseSignedPesos } from '#/modules/pricing/lib/money'

describe('exactAmountText', () => {
  test.each([
    [0, '0.00'],
    [5, '0.05'],
    [43850, '438.50'],
    [123400, '1234.00'],
    [100000000, '1000000.00'],
  ])('%i cents → %s', (cents, text) => {
    expect(exactAmountText(cents)).toBe(text)
  })

  test('round-trips through the pesos parser', () => {
    expect(parseSignedPesos(exactAmountText(987654))).toEqual({
      ok: true,
      value: 987654,
    })
  })
})

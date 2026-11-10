import { describe, expect, test } from 'bun:test'
import { digitsOnly, parseBoxCount } from '#/modules/inventory/lib/box-count'

describe('parseBoxCount', () => {
  test('reads whole boxes; blank means zero', () => {
    expect(parseBoxCount('12')).toEqual({ ok: true, value: 12 })
    expect(parseBoxCount(' 3 ')).toEqual({ ok: true, value: 3 })
    expect(parseBoxCount('')).toEqual({ ok: true, value: 0 })
  })

  test('rejects decimals, negatives and text', () => {
    for (const text of ['1.5', '-2', 'abc', '1e3']) {
      expect(parseBoxCount(text).ok).toBe(false)
    }
  })

  test('rejects numbers beyond the safe range', () => {
    expect(parseBoxCount('99999999999999999999').ok).toBe(false)
  })
})

describe('digitsOnly', () => {
  test('drops everything that is not a digit, as typed or pasted', () => {
    expect(digitsOnly('yyy')).toBe('')
    expect(digitsOnly('12abc')).toBe('12')
    expect(digitsOnly(' 4 5 ')).toBe('45')
    expect(digitsOnly('1.5')).toBe('15')
    expect(digitsOnly('-2')).toBe('2')
    expect(digitsOnly('')).toBe('')
  })
})

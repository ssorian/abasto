import { describe, expect, test } from 'bun:test'
import { writeOffError } from '#/modules/inventory/lib/pending-writeoff'

describe('writeOffError', () => {
  test('accepts boxes from one up to what is owed', () => {
    expect(writeOffError('1', 3)).toBeNull()
    expect(writeOffError('3', 3)).toBeNull()
  })

  test('rejects blank, zero, decimals and text', () => {
    for (const text of ['', '0', '1.5', 'x', '-1']) {
      expect(writeOffError(text, 3)).not.toBeNull()
    }
  })

  test('rejects more boxes than owed', () => {
    expect(writeOffError('4', 3)).toContain('debe')
  })
})

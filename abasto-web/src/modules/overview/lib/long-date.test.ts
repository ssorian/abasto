import { describe, expect, test } from 'bun:test'
import { longDate } from '#/modules/overview/lib/long-date'

describe('longDate', () => {
  test('a business day reads as weekday, day and month in Spanish', () => {
    expect(longDate('2026-11-12')).toBe('jueves 12 de noviembre')
    expect(longDate('2026-01-01')).toBe('jueves 1 de enero')
  })
})

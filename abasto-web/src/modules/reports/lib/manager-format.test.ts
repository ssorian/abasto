import { describe, expect, test } from 'bun:test'
import {
  dayAxisLabel,
  shortDate,
  timeLabel,
} from '#/modules/reports/lib/manager-format'

describe('manager dashboard dates', () => {
  test('business dates read as day and month, with no time-zone shift', () => {
    expect(shortDate('2026-11-12')).toBe('12 nov')
    expect(shortDate('2026-01-01')).toBe('1 ene')
  })

  test('chart axis shows the weekday and the day', () => {
    expect(dayAxisLabel('2026-11-02')).toBe('lun 2')
    expect(dayAxisLabel('2026-11-08')).toBe('dom 8')
  })

  test('opening time is read in Mexico City', () => {
    expect(timeLabel(new Date('2026-11-08T14:20:00Z'))).toBe('08:20')
  })
})

import { describe, expect, test } from 'bun:test'
import {
  deltaTone,
  formatBpsPercent,
  formatDeltaBps,
  formatDeltaCents,
} from '#/modules/executive/lib/format'

describe('executive formatting', () => {
  test('basis points show as a percent, em dash when unknown', () => {
    expect(formatBpsPercent(8913)).toBe('89.1 %')
    expect(formatBpsPercent(-5000)).toBe('-50.0 %')
    expect(formatBpsPercent(null)).toBe('—')
  })

  test('deltas carry an explicit sign', () => {
    expect(formatDeltaBps(250, 'pp')).toBe('+2.5 pp')
    expect(formatDeltaBps(-1000, '%')).toBe('-10.0 %')
    expect(formatDeltaBps(0, '%')).toBe('0.0 %')
    expect(formatDeltaBps(null, '%')).toBe('—')
    expect(formatDeltaCents(150)).toBe('+$1.50')
    expect(formatDeltaCents(-150)).toBe('-$1.50')
    expect(formatDeltaCents(0)).toBe('$0.00')
  })

  test('tone follows the sign', () => {
    expect(deltaTone(5)).toBe('up')
    expect(deltaTone(-5)).toBe('down')
    expect(deltaTone(0)).toBe('flat')
    expect(deltaTone(null)).toBe('flat')
  })
})

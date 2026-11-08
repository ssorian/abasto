import { describe, expect, test } from 'bun:test'
import {
  deltaOf,
  marginBps,
  metricsOf,
  previousRange,
} from '#/modules/executive/lib/profitability'

describe('profitability math', () => {
  test('margin in basis points rounds and is null without revenue', () => {
    expect(marginBps(5348, 6000)).toBe(8913)
    expect(marginBps(-500, 1000)).toBe(-5000)
    expect(marginBps(0, 0)).toBeNull()
  })

  test('previous range has equal length and ends the day before', () => {
    expect(previousRange({ from: '2026-11-08', to: '2026-11-14' })).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    })
    expect(previousRange({ from: '2026-03-01', to: '2026-03-01' })).toEqual({
      from: '2026-02-28',
      to: '2026-02-28',
    })
    expect(previousRange({ from: '2026-03-01', to: '2026-03-31' })).toEqual({
      from: '2026-01-29',
      to: '2026-02-28',
    })
  })

  test('average ticket rounds to cents and is 0 without tickets', () => {
    expect(metricsOf(1000, 0, 3).averageTicketCents).toBe(333)
    expect(metricsOf(0, 0, 0).averageTicketCents).toBe(0)
  })

  test('delta against an empty previous period has no relative change', () => {
    const delta = deltaOf(metricsOf(500, 100, 1), metricsOf(0, 0, 0))
    expect(delta).toMatchObject({
      revenueCents: 500,
      revenueChangeBps: null,
      marginBps: null,
    })
  })
})

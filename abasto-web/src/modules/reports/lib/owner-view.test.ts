import { describe, expect, test } from 'bun:test'
import {
  chartDays,
  comparisonNoun,
  periodHeading,
  shareBps,
} from '#/modules/reports/lib/owner-view'
import type { DailyPoint } from '#/modules/reports/lib/owner-series'

const point = (day: string, revenueCents: number): DailyPoint => ({
  day,
  previousDay: day,
  revenueCents,
  marginCents: 0,
  orders: 0,
  averageTicketCents: 0,
  previousRevenueCents: 0,
})

describe('chartDays', () => {
  const days = [point('2026-11-09', 160700), point('2026-11-10', 0)]

  test('a week is drawn whole: days after the last one are future', () => {
    const bars = chartDays('week', days, '2026-11-10')
    expect(bars.map((bar) => bar.label)).toEqual([
      'Lun 9',
      'Hoy',
      'Mié 11',
      'Jue 12',
      'Vie 13',
      'Sáb 14',
      'Dom 15',
    ])
    expect(bars.map((bar) => bar.state)).toEqual([
      'sold',
      'zero',
      'future',
      'future',
      'future',
      'future',
      'future',
    ])
    expect(bars[0]).toMatchObject({ heightPercent: 100, today: false })
    expect(bars[1]).toMatchObject({ heightPercent: 0, today: true })
  })

  test('a month is drawn to its last day, with the day number as label', () => {
    const bars = chartDays(
      'month',
      [point('2026-02-01', 100), point('2026-02-02', 50)],
      '2026-02-02',
    )
    expect(bars).toHaveLength(28)
    expect(bars[0]).toMatchObject({ label: '1', heightPercent: 100 })
    expect(bars[1]).toMatchObject({ label: '2', heightPercent: 50 })
    expect(bars[27]).toMatchObject({ label: '28', state: 'future' })
  })

  test('other periods draw only their own days', () => {
    const bars = chartDays('custom', days, '2026-11-13')
    expect(bars.map((bar) => bar.label)).toEqual(['Lun 9', 'Mar 10'])
  })
})

describe('periodHeading', () => {
  test('names the period the way the owner chose it', () => {
    const week = { from: '2026-11-09', to: '2026-11-13' }
    expect(periodHeading('week', week)).toBe('Semana del 9 al 13 nov 2026')
    expect(
      periodHeading('month', { from: '2026-11-01', to: '2026-11-13' }),
    ).toBe('Noviembre 2026, al día 13')
    expect(
      periodHeading('today', { from: '2026-11-13', to: '2026-11-13' }),
    ).toBe('Hoy, vie 13 nov 2026')
    expect(periodHeading('custom', week)).toBe('Del 9 al 13 nov 2026')
  })

  test('names what the period is compared with', () => {
    expect(comparisonNoun('week')).toBe('semana anterior')
    expect(comparisonNoun('month')).toBe('mes anterior')
    expect(comparisonNoun('today')).toBe('día anterior')
    expect(comparisonNoun('custom')).toBe('periodo anterior')
  })
})

test('shareBps is the part of a total in basis points, zero without total', () => {
  expect(shareBps(340700, 643658)).toBe(5293)
  expect(shareBps(10, 0)).toBe(0)
})

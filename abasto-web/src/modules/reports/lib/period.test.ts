import { describe, expect, test } from 'bun:test'
import {
  comparisonRange,
  longRangeLabel,
  resolvePeriod,
} from '#/modules/reports/lib/period'

const today = '2026-11-04'
const message = (run: () => unknown) => {
  try {
    run()
  } catch (error) {
    return (error as Error).message
  }
  return undefined
}

describe('resolvePeriod', () => {
  test('presets end today in the business calendar', () => {
    expect(resolvePeriod({ preset: 'today' }, today)).toEqual({
      from: '2026-11-04',
      to: '2026-11-04',
    })
    expect(resolvePeriod({ preset: '7' }, today)).toEqual({
      from: '2026-10-29',
      to: '2026-11-04',
    })
    expect(resolvePeriod({ preset: '30' }, today)).toEqual({
      from: '2026-10-06',
      to: '2026-11-04',
    })
  })

  test('custom keeps the given business dates', () => {
    expect(
      resolvePeriod(
        { preset: 'custom', from: '2026-10-01', to: '2026-10-31' },
        today,
      ),
    ).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })

  test('custom rejects missing, impossible, reversed and oversized ranges', () => {
    const custom = (from?: string, to?: string) =>
      message(() => resolvePeriod({ preset: 'custom', from, to }, today))
    expect(custom(undefined, '2026-10-01')).toBe(
      'Elige fechas válidas para el periodo.',
    )
    expect(custom('2026-02-30', '2026-03-01')).toBe(
      'Elige fechas válidas para el periodo.',
    )
    expect(custom('2026-10-31', '2026-10-01')).toBe(
      'La fecha inicial no puede ser posterior a la final.',
    )
    expect(custom('2024-01-01', '2026-01-01')).toBe(
      'El periodo no puede ser mayor a un año.',
    )
  })
})

describe('longRangeLabel', () => {
  test('writes a range in the same month once', () => {
    expect(longRangeLabel({ from: '2026-11-06', to: '2026-11-12' })).toBe(
      '6 al 12 nov 2026',
    )
  })

  test('a single day reads as one date', () => {
    expect(longRangeLabel({ from: '2026-11-12', to: '2026-11-12' })).toBe(
      '12 nov 2026',
    )
  })

  test('crossing months names both months, year once', () => {
    expect(longRangeLabel({ from: '2026-10-30', to: '2026-11-05' })).toBe(
      '30 oct al 5 nov 2026',
    )
  })

  test('the comparison can drop the year the main range already shows', () => {
    expect(longRangeLabel({ from: '2026-10-30', to: '2026-11-05' }, 2026)).toBe(
      '30 oct al 5 nov',
    )
  })

  test('crossing years keeps both years', () => {
    expect(longRangeLabel({ from: '2025-12-28', to: '2026-01-03' })).toBe(
      '28 dic 2025 al 3 ene 2026',
    )
    expect(longRangeLabel({ from: '2025-12-28', to: '2026-01-03' }, 2026)).toBe(
      '28 dic 2025 al 3 ene 2026',
    )
  })
})

describe('calendar presets', () => {
  test('week runs from Monday to today, month from the 1st to today', () => {
    // 2026-11-04 is a Wednesday.
    expect(resolvePeriod({ preset: 'week' }, today)).toEqual({
      from: '2026-11-02',
      to: '2026-11-04',
    })
    expect(resolvePeriod({ preset: 'week' }, '2026-11-02')).toEqual({
      from: '2026-11-02',
      to: '2026-11-02',
    })
    expect(resolvePeriod({ preset: 'week' }, '2026-11-08')).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    })
    expect(resolvePeriod({ preset: 'month' }, today)).toEqual({
      from: '2026-11-01',
      to: '2026-11-04',
    })
  })

  test('an anchor stands in for today, and cannot be invalid or in the future', () => {
    expect(
      resolvePeriod({ preset: 'month', anchor: '2026-10-31' }, today),
    ).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(
      resolvePeriod({ preset: 'week', anchor: '2026-11-01' }, today),
    ).toEqual({ from: '2026-10-26', to: '2026-11-01' })
    expect(
      resolvePeriod({ preset: 'today', anchor: '2026-11-03' }, today),
    ).toEqual({ from: '2026-11-03', to: '2026-11-03' })
    expect(
      message(() => resolvePeriod({ preset: 'week', anchor: 'nope' }, today)),
    ).toBe('Elige fechas válidas para el periodo.')
    expect(
      message(() =>
        resolvePeriod({ preset: 'week', anchor: '2026-11-05' }, today),
      ),
    ).toBe('Elige fechas válidas para el periodo.')
  })
})

describe('comparisonRange', () => {
  test('week compares with the same days of the week before', () => {
    expect(
      comparisonRange('week', { from: '2026-11-02', to: '2026-11-04' }),
    ).toEqual({ from: '2026-10-26', to: '2026-10-28' })
  })

  test('month compares with the same days of the month before, clamped to its length', () => {
    expect(
      comparisonRange('month', { from: '2026-11-01', to: '2026-11-13' }),
    ).toEqual({ from: '2026-10-01', to: '2026-10-13' })
    expect(
      comparisonRange('month', { from: '2026-03-01', to: '2026-03-31' }),
    ).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(
      comparisonRange('month', { from: '2026-01-01', to: '2026-01-15' }),
    ).toEqual({ from: '2025-12-01', to: '2025-12-15' })
  })

  test('every other preset keeps the equal-length period that ends the day before', () => {
    expect(
      comparisonRange('7', { from: '2026-10-29', to: '2026-11-04' }),
    ).toEqual({ from: '2026-10-22', to: '2026-10-28' })
    expect(
      comparisonRange('today', { from: '2026-11-04', to: '2026-11-04' }),
    ).toEqual({ from: '2026-11-03', to: '2026-11-03' })
    expect(
      comparisonRange('custom', { from: '2026-11-01', to: '2026-11-03' }),
    ).toEqual({ from: '2026-10-29', to: '2026-10-31' })
  })
})

import { describe, expect, test } from 'bun:test'
import { resolvePeriod } from '#/modules/reports/lib/period'

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

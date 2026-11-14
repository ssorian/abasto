import { describe, expect, test } from 'bun:test'
import { pdfChoices } from '#/modules/reports/lib/pdf-choices'
import { resolvePeriod } from '#/modules/reports/lib/period'

describe('pdfChoices', () => {
  const today = '2026-11-13'
  const choices = pdfChoices(today)
  const ranges = Object.fromEntries(
    choices.map((choice) => [choice.id, resolvePeriod(choice.period, today)]),
  )

  test('offers the periods in course, then the ones just closed', () => {
    expect(choices.map((choice) => [choice.label, choice.kind])).toEqual([
      ['Día', 'day'],
      ['Semana', 'week'],
      ['Mes', 'month'],
      ['Ayer', 'day'],
      ['Semana pasada', 'week'],
      ['Mes pasado', 'month'],
    ])
  })

  test('each choice resolves to its calendar range', () => {
    expect(ranges).toEqual({
      day: { from: '2026-11-13', to: '2026-11-13' },
      week: { from: '2026-11-09', to: '2026-11-13' },
      month: { from: '2026-11-01', to: '2026-11-13' },
      yesterday: { from: '2026-11-12', to: '2026-11-12' },
      'last-week': { from: '2026-11-02', to: '2026-11-08' },
      'last-month': { from: '2026-10-01', to: '2026-10-31' },
    })
  })

  test('closed periods cross the year on the first of January', () => {
    const january = pdfChoices('2027-01-01')
    const range = (id: string) =>
      resolvePeriod(
        january.find((choice) => choice.id === id)!.period,
        '2027-01-01',
      )
    expect(range('yesterday')).toEqual({ from: '2026-12-31', to: '2026-12-31' })
    expect(range('last-week')).toEqual({ from: '2026-12-21', to: '2026-12-27' })
    expect(range('last-month')).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    })
  })
})

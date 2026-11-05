import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import {
  periodReportInput,
  stockAlertsInput,
} from '#/modules/reports/server/report-inputs'

describe('report inputs', () => {
  test('accept a preset or a custom range with an optional warehouse', () => {
    expect(parseInput(periodReportInput, { period: { preset: '7' } })).toEqual({
      period: { preset: '7' },
    })
    expect(
      parseInput(periodReportInput, {
        period: { preset: 'custom', from: '2026-10-01', to: '2026-10-31' },
        warehouseId: 'w1',
      }),
    ).toMatchObject({ warehouseId: 'w1' })
  })

  test('refuse unknown presets, empty ids and malformed bodies', () => {
    for (const bad of [
      undefined,
      {},
      { period: { preset: 'year' } },
      { period: { preset: 'today' }, warehouseId: '' },
    ]) {
      expect(() => parseInput(periodReportInput, bad)).toThrow(
        'Revisa los datos e intenta de nuevo.',
      )
    }
    expect(() => parseInput(stockAlertsInput, { expiringDays: 'x' })).toThrow()
  })
})

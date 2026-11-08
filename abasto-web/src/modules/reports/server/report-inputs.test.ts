import { describe, expect, test } from 'bun:test'
import { parseInput } from '#/lib/boundary'
import {
  inventoryFiltersInput,
  nonMovingInput,
  periodOnlyInput,
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

  test('accept an optional supplier and refuse an empty one', () => {
    expect(
      parseInput(periodReportInput, {
        period: { preset: '7' },
        supplierId: 's1',
      }),
    ).toMatchObject({ supplierId: 's1' })
    expect(parseInput(stockAlertsInput, { supplierId: 's1' })).toEqual({
      supplierId: 's1',
    })
    expect(() => parseInput(stockAlertsInput, { supplierId: '' })).toThrow()
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

  test('owner inputs accept optional warehouse and supplier and refuse empty ones', () => {
    const filters = { warehouseId: 'w1', supplierId: 's1' }
    expect(
      parseInput(periodOnlyInput, { period: { preset: '7' }, ...filters }),
    ).toEqual({ period: { preset: '7' }, ...filters })
    expect(parseInput(inventoryFiltersInput, filters)).toEqual(filters)
    expect(parseInput(inventoryFiltersInput, {})).toEqual({})
    expect(parseInput(nonMovingInput, { days: 60, ...filters })).toEqual({
      days: 60,
      ...filters,
    })
    for (const bad of [{ warehouseId: '' }, { supplierId: '' }]) {
      expect(() => parseInput(inventoryFiltersInput, bad)).toThrow()
      expect(() => parseInput(nonMovingInput, bad)).toThrow()
      expect(() =>
        parseInput(periodOnlyInput, { period: { preset: '7' }, ...bad }),
      ).toThrow()
    }
  })
})

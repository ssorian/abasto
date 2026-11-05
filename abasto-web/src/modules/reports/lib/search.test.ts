import { describe, expect, test } from 'bun:test'
import { parseReportSearch, periodOf } from '#/modules/reports/lib/search'

describe('report search params', () => {
  test('defaults stay out of the URL and junk is dropped', () => {
    expect(parseReportSearch({})).toEqual({})
    expect(
      parseReportSearch({
        tab: 'ventas',
        periodo: '7',
        dias: '7',
        almacen: '',
      }),
    ).toEqual({})
    expect(
      parseReportSearch({ tab: 'nope', periodo: 'year', dias: 'x', desde: 5 }),
    ).toEqual({})
  })

  test('valid values survive', () => {
    expect(
      parseReportSearch({
        tab: 'inventario',
        periodo: 'custom',
        desde: '2026-10-01',
        hasta: '2026-10-31',
        almacen: 'w1',
        dias: '14',
      }),
    ).toEqual({
      tab: 'inventario',
      periodo: 'custom',
      desde: '2026-10-01',
      hasta: '2026-10-31',
      almacen: 'w1',
      dias: 14,
    })
  })

  test('periodOf maps the URL to a service period', () => {
    expect(periodOf({})).toEqual({ preset: '7' })
    expect(periodOf({ periodo: '30', desde: '2026-10-01' })).toEqual({
      preset: '30',
    })
    expect(
      periodOf({ periodo: 'custom', desde: '2026-10-01', hasta: '2026-10-02' }),
    ).toEqual({ preset: 'custom', from: '2026-10-01', to: '2026-10-02' })
  })
})

import { describe, expect, test } from 'bun:test'
import { parseManagerReportsSearch } from '#/modules/reports/lib/manager-search'

describe('manager report search params', () => {
  test('defaults and junk stay out of the URL', () => {
    expect(parseManagerReportsSearch({})).toEqual({})
    expect(
      parseManagerReportsSearch({ periodo: '7', almacen: '', desde: 5 }),
    ).toEqual({})
  })

  test('calendar periods: the week is the default, rolling presets are dropped', () => {
    expect(parseManagerReportsSearch({ periodo: 'week' })).toEqual({})
    expect(parseManagerReportsSearch({ periodo: '30' })).toEqual({})
    expect(parseManagerReportsSearch({ periodo: 'month' })).toEqual({
      periodo: 'month',
    })
    expect(parseManagerReportsSearch({ periodo: 'today' })).toEqual({
      periodo: 'today',
    })
  })

  test('keeps only the period, the warehouse and the supplier', () => {
    expect(
      parseManagerReportsSearch({
        tab: 'cajas',
        proveedor: 's1',
        dias: '14',
        periodo: 'custom',
        desde: '2026-10-01',
        hasta: '2026-10-31',
        almacen: 'w1',
      }),
    ).toEqual({
      periodo: 'custom',
      desde: '2026-10-01',
      hasta: '2026-10-31',
      almacen: 'w1',
      proveedor: 's1',
    })
  })
})

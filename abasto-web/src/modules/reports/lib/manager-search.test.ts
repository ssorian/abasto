import { describe, expect, test } from 'bun:test'
import { parseManagerReportsSearch } from '#/modules/reports/lib/manager-search'

describe('manager report search params', () => {
  test('defaults and junk stay out of the URL', () => {
    expect(parseManagerReportsSearch({})).toEqual({})
    expect(
      parseManagerReportsSearch({ periodo: '7', almacen: '', desde: 5 }),
    ).toEqual({})
  })

  test('keeps only the period and the warehouse', () => {
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
    })
  })
})

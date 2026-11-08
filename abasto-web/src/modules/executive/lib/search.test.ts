import { describe, expect, test } from 'bun:test'
import {
  defaultNonMovingDays,
  parseExecutiveSearch,
} from '#/modules/executive/lib/search'

describe('executive search params', () => {
  test('defaults and junk stay out of the URL', () => {
    expect(parseExecutiveSearch({})).toEqual({})
    expect(
      parseExecutiveSearch({ periodo: '7', sinventa: '30', almacen: '' }),
    ).toEqual({})
    expect(parseExecutiveSearch({ periodo: 'year', sinventa: '45' })).toEqual(
      {},
    )
  })

  test('period reuses the report parsing and days are 30/60/90 only', () => {
    expect(
      parseExecutiveSearch({
        periodo: 'custom',
        desde: '2026-11-01',
        hasta: '2026-11-07',
        sinventa: '90',
      }),
    ).toEqual({
      periodo: 'custom',
      desde: '2026-11-01',
      hasta: '2026-11-07',
      sinventa: 90,
    })
    expect(parseExecutiveSearch({ sinventa: 60 })).toEqual({ sinventa: 60 })
    expect(defaultNonMovingDays).toBe(30)
  })

  test('keeps the warehouse and supplier filters, and drops empty ones', () => {
    expect(
      parseExecutiveSearch({ almacen: 'w1', proveedor: 's1', tab: 'cajas' }),
    ).toEqual({ almacen: 'w1', proveedor: 's1' })
    expect(parseExecutiveSearch({ almacen: '', proveedor: 5 })).toEqual({})
  })
})

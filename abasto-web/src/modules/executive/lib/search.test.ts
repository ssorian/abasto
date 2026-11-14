import { describe, expect, test } from 'bun:test'
import {
  defaultNonMovingDays,
  executivePeriodOf,
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

describe('owner calendar periods', () => {
  test('week is the default and stays out of the URL; month and today are kept', () => {
    expect(parseExecutiveSearch({ periodo: 'week' })).toEqual({})
    expect(parseExecutiveSearch({ periodo: 'month' })).toEqual({
      periodo: 'month',
    })
    expect(parseExecutiveSearch({ periodo: 'today' })).toEqual({
      periodo: 'today',
    })
    // A rolling preset belongs to the manager view; the owner never emits it.
    expect(parseExecutiveSearch({ periodo: '30' })).toEqual({})
  })

  test('the owner period falls back to the week for absent or rolling presets', () => {
    expect(executivePeriodOf({})).toEqual({ preset: 'week' })
    expect(executivePeriodOf({ periodo: '30' })).toEqual({ preset: 'week' })
    expect(executivePeriodOf({ periodo: 'month' })).toEqual({ preset: 'month' })
    expect(
      executivePeriodOf({
        periodo: 'custom',
        desde: '2026-11-01',
        hasta: '2026-11-07',
      }),
    ).toEqual({ preset: 'custom', from: '2026-11-01', to: '2026-11-07' })
  })
})

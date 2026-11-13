import { describe, expect, test } from 'bun:test'
import { metricsOf } from '#/modules/overview/lib/overview-metrics'
import type { Overview } from '#/modules/overview/types/overview'

const base: Overview = {
  today: '2026-11-04',
  warehouses: [],
  totals: {
    openOrders: 3,
    expiringTodayOrders: 1,
    pickedUpToday: 2,
    drawersOpen: 1,
    belowMinimum: 0,
    expiringLots: 0,
  },
  lowStock: [],
  expired: [],
  expiring: [],
}

describe('Inicio headline figures', () => {
  test('managers see sales, margin and open orders', () => {
    const labels = metricsOf({
      ...base,
      totals: { ...base.totals, salesCents: 450_000, marginCents: 90_050 },
    })
    expect(labels).toEqual([
      { label: 'Ventas de hoy', value: '$4,500.00' },
      { label: 'Utilidad bruta de hoy', value: '$900.50' },
      { label: 'Pedidos abiertos', value: '3' },
    ])
  })

  test('without managed warehouses only operational counts show', () => {
    const metrics = metricsOf(base)
    expect(metrics.map((item) => item.label)).toEqual([
      'Entregas de hoy',
      'Pedidos abiertos',
      'Pedidos que vencen hoy',
      'Cajas abiertas',
    ])
    expect(metrics.some((item) => item.value.includes('$'))).toBe(false)
  })
})

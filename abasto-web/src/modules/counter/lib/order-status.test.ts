import { describe, expect, test } from 'bun:test'
import {
  availableActions,
  chargeGate,
  orderStatusFilters,
  statusHint,
  statusTone,
} from '#/modules/counter/lib/order-status'

describe('order status', () => {
  test('filters are the real statuses, nothing from the demo', () => {
    expect(orderStatusFilters).toEqual([
      'Todos',
      'Reservado',
      'Preparado',
      'Recogido',
      'Cancelado',
      'Vencido',
    ])
  })

  test('actions follow the service transitions', () => {
    expect(availableActions('Reservado')).toEqual({
      prepare: true,
      pickup: true,
      cancel: true,
    })
    expect(availableActions('Preparado')).toEqual({
      prepare: false,
      pickup: true,
      cancel: true,
    })
    for (const final of ['Recogido', 'Cancelado', 'Vencido'] as const) {
      expect(availableActions(final)).toEqual({
        prepare: false,
        pickup: false,
        cancel: false,
      })
    }
  })

  test('every status has a tone and a hint', () => {
    for (const status of [
      'Reservado',
      'Preparado',
      'Recogido',
      'Cancelado',
      'Vencido',
    ] as const) {
      expect(statusTone(status).length).toBeGreaterThan(0)
      expect(statusHint(status).length).toBeGreaterThan(0)
    }
    expect(statusHint('Vencido')).toBe('Venció y se liberó el producto.')
  })
})

describe('chargeGate', () => {
  test('an open order cannot be charged while the drawer is closed, and says why', () => {
    expect(chargeGate('Reservado', false)).toEqual({
      enabled: false,
      notice: 'Abre la caja antes de cobrar.',
    })
    expect(chargeGate('Preparado', false).enabled).toBe(false)
  })

  test('with the drawer open charging is enabled and there is no notice', () => {
    expect(chargeGate('Reservado', true)).toEqual({
      enabled: true,
      notice: null,
    })
  })

  test('orders that cannot be charged get no cash notice', () => {
    for (const status of ['Recogido', 'Cancelado', 'Vencido'] as const) {
      expect(chargeGate(status, false)).toEqual({
        enabled: false,
        notice: null,
      })
    }
  })
})

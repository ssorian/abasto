import { describe, expect, test } from 'bun:test'
import {
  availableActions,
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

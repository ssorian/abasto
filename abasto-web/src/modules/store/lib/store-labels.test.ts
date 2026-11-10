import { describe, expect, test } from 'bun:test'

import {
  availabilityTone,
  canAddToCart,
  canCancelOrder,
  formatPickupDate,
  orderStatusTone,
  pickupDeadlineLabel,
  storeOrderCode,
} from './store-labels'

describe('store labels', () => {
  test('availability tones and purchasability', () => {
    expect(availabilityTone('Disponible')).toBe('green')
    expect(availabilityTone('Pocas')).toBe('amber')
    expect(availabilityTone('Agotado')).toBe('gray')
    expect(canAddToCart('Disponible')).toBe(true)
    expect(canAddToCart('Pocas')).toBe(true)
    expect(canAddToCart('Agotado')).toBe(false)
  })

  test('only Reservado orders can be cancelled by the customer', () => {
    expect(canCancelOrder('Reservado')).toBe(true)
    for (const status of [
      'Preparado',
      'Recogido',
      'Cancelado',
      'Vencido',
    ] as const) {
      expect(canCancelOrder(status)).toBe(false)
    }
  })

  test('order status tones', () => {
    expect(orderStatusTone('Reservado')).toBe('blue')
    expect(orderStatusTone('Preparado')).toBe('amber')
    expect(orderStatusTone('Recogido')).toBe('green')
    expect(orderStatusTone('Cancelado')).toBe('gray')
    expect(orderStatusTone('Vencido')).toBe('red')
  })

  test('short order code', () => {
    expect(storeOrderCode('3f2a9c1e-aaaa-bbbb')).toBe('PED-3F2A9C1E')
  })

  test('pickup date in es-MX, Mexico City time', () => {
    const text = formatPickupDate(new Date('2026-11-09T20:30:00Z'))
    expect(text).toContain('9')
    expect(text).toContain('nov')
    expect(text).toContain('2:30')
  })

  test('pickup deadline shows only while it matters', () => {
    const date = new Date('2026-11-09T20:30:00Z')
    expect(pickupDeadlineLabel('Reservado', date)?.prefix).toBe(
      'Recoge antes de',
    )
    expect(pickupDeadlineLabel('Preparado', date)?.prefix).toBe(
      'Recoge antes de',
    )
    expect(pickupDeadlineLabel('Vencido', date)?.prefix).toBe('Venció el')
    expect(pickupDeadlineLabel('Vencido', date)?.date).toBe(
      formatPickupDate(date),
    )
    expect(pickupDeadlineLabel('Recogido', date)).toBeNull()
    expect(pickupDeadlineLabel('Cancelado', date)).toBeNull()
  })

  test('order code has a plain hyphen and no spaces', () => {
    expect(storeOrderCode('5d6635e3-0000')).toMatch(/^PED-[0-9A-F]{8}$/)
  })
})

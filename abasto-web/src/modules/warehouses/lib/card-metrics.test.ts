import { describe, expect, test } from 'bun:test'
import { isAlertMetric } from '#/modules/warehouses/lib/card-metrics'

describe('isAlertMetric', () => {
  test('an alert metric reads as alert only above zero', () => {
    expect(isAlertMetric(0, true)).toBe(false)
    expect(isAlertMetric(1, true)).toBe(true)
    expect(isAlertMetric(12, true)).toBe(true)
  })

  test('plain metrics never read as alerts', () => {
    expect(isAlertMetric(5, false)).toBe(false)
  })
})

import { describe, expect, test } from 'bun:test'

import {
  assignInput,
  cancelAssignmentInput,
  createRiderInput,
  overviewInput,
  renameRiderInput,
  setActiveInput,
  settleInput,
} from './rider-inputs'

describe('rider server inputs', () => {
  test('accept well-formed payloads', () => {
    expect(overviewInput.safeParse({}).success).toBe(true)
    expect(overviewInput.safeParse({ warehouseId: 'w' }).success).toBe(true)
    expect(
      createRiderInput.safeParse({ warehouseId: 'w', name: 'Luis' }).success,
    ).toBe(true)
    expect(
      renameRiderInput.safeParse({ riderId: 'r', name: 'Luis' }).success,
    ).toBe(true)
    expect(
      setActiveInput.safeParse({ riderId: 'r', active: false }).success,
    ).toBe(true)
    expect(
      assignInput.safeParse({
        riderId: 'r',
        lines: [{ productId: 'p', boxes: 2, units: 1 }],
      }).success,
    ).toBe(true)
    expect(
      settleInput.safeParse({
        assignmentId: 'a',
        deliveredCents: 0,
        lines: [{ lineId: 'l', units: 3 }],
      }).success,
    ).toBe(true)
    expect(cancelAssignmentInput.safeParse({ assignmentId: 'a' }).success).toBe(
      true,
    )
  })

  test('refuse missing ids, fractional cents and non-numeric quantities', () => {
    expect(setActiveInput.safeParse({ riderId: 'r' }).success).toBe(false)
    expect(cancelAssignmentInput.safeParse({ assignmentId: '' }).success).toBe(
      false,
    )
    expect(
      settleInput.safeParse({
        assignmentId: 'a',
        deliveredCents: 1.5,
        lines: [],
      }).success,
    ).toBe(false)
    expect(
      assignInput.safeParse({
        riderId: 'r',
        lines: [{ productId: 'p', boxes: '2' }],
      }).success,
    ).toBe(false)
  })
})

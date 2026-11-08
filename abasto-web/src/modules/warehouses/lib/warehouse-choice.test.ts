import { describe, expect, test } from 'bun:test'
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'

const warehouse = (id: string) => ({ id, name: `Almacén ${id}` })

describe('hasWarehouseChoice', () => {
  test('a user with a single warehouse gets no selector', () => {
    expect(hasWarehouseChoice([warehouse('a')])).toBe(false)
  })

  test('a user with no warehouse gets no selector', () => {
    expect(hasWarehouseChoice([])).toBe(false)
  })

  test('a user covering two or more warehouses keeps the selector', () => {
    expect(hasWarehouseChoice([warehouse('a'), warehouse('b')])).toBe(true)
    expect(
      hasWarehouseChoice([warehouse('a'), warehouse('b'), warehouse('c')]),
    ).toBe(true)
  })
})

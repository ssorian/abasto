import { describe, expect, test } from 'bun:test'
import {
  chipLabel,
  userRoleLabel,
  warehouseRoleLabel,
} from '#/modules/access/lib/role-labels'

describe('role labels', () => {
  test('maps roles to Spanish labels', () => {
    expect(userRoleLabel('owner')).toBe('Dueño')
    expect(userRoleLabel('staff')).toBe('Personal')
    expect(warehouseRoleLabel('manager')).toBe('Encargado')
  })

  test('chipLabel joins warehouse and role', () => {
    expect(
      chipLabel({ warehouseId: 'a', warehouseName: 'Norte', role: 'manager' }),
    ).toBe('Norte · Encargado')
  })
})

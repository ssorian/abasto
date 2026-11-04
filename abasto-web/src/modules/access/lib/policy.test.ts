import { describe, expect, test } from 'bun:test'
import { AppError } from '#/lib/errors'
import { authorize, can } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'

const north = 'warehouse-north'
const south = 'warehouse-south'

const actor = (
  role: Actor['role'],
  assignments: Record<string, 'manager' | 'clerk'> = {},
): Actor => ({
  userId: 'user-1',
  role,
  assignments: new Map(Object.entries(assignments)),
})

describe('can', () => {
  test('the owner holds every permission in every warehouse', () => {
    const owner = actor('owner')
    for (const permission of [
      'catalog.manage',
      'warehouses.manage',
      'users.manage',
      'credit.authorize',
    ] as const) {
      expect(can(owner, permission)).toBe(true)
    }
    for (const permission of [
      'warehouse.view',
      'warehouse.operate',
      'warehouse.manage',
    ] as const) {
      expect(can(owner, permission, north)).toBe(true)
      expect(can(owner, permission, south)).toBe(true)
    }
  })

  test('a manager views, operates and manages only the assigned warehouse', () => {
    const manager = actor('staff', { [north]: 'manager' })
    expect(can(manager, 'warehouse.view', north)).toBe(true)
    expect(can(manager, 'warehouse.operate', north)).toBe(true)
    expect(can(manager, 'warehouse.manage', north)).toBe(true)
    expect(can(manager, 'warehouse.view', south)).toBe(false)
    expect(can(manager, 'warehouse.operate', south)).toBe(false)
    expect(can(manager, 'warehouse.manage', south)).toBe(false)
  })

  test('a clerk views and operates the assigned warehouse but does not manage it', () => {
    const clerk = actor('staff', { [north]: 'clerk' })
    expect(can(clerk, 'warehouse.view', north)).toBe(true)
    expect(can(clerk, 'warehouse.operate', north)).toBe(true)
    expect(can(clerk, 'warehouse.manage', north)).toBe(false)
    expect(can(clerk, 'warehouse.operate', south)).toBe(false)
  })

  test('staff never hold owner-only permissions, whatever their assignments', () => {
    const manager = actor('staff', { [north]: 'manager', [south]: 'manager' })
    expect(can(manager, 'catalog.manage')).toBe(false)
    expect(can(manager, 'warehouses.manage')).toBe(false)
    expect(can(manager, 'users.manage')).toBe(false)
    expect(can(manager, 'credit.authorize')).toBe(false)
  })

  test('a warehouse permission without a warehouse is denied to staff', () => {
    expect(can(actor('staff', { [north]: 'manager' }), 'warehouse.view')).toBe(
      false,
    )
  })
})

describe('authorize', () => {
  test('returns silently when the permission is held', () => {
    expect(() => authorize(actor('owner'), 'users.manage')).not.toThrow()
  })

  test('throws a forbidden AppError otherwise', () => {
    let error: unknown
    try {
      authorize(actor('staff', { [north]: 'clerk' }), 'warehouse.manage', north)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('forbidden')
    expect((error as AppError).message).toBe(
      'No tienes permiso para esta acción.',
    )
  })
})

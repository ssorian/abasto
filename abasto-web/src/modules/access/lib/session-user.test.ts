import { describe, expect, test } from 'bun:test'
import { toSessionUser } from '#/modules/access/lib/session-user'

describe('toSessionUser', () => {
  test('owner is labeled Dueño with initials', () => {
    expect(
      toSessionUser({ name: 'Mariana Ruiz', email: 'm@x.co', role: 'owner' }),
    ).toEqual({
      name: 'Mariana Ruiz',
      email: 'm@x.co',
      role: 'owner',
      roleLabel: 'Dueño',
      initials: 'MR',
    })
  })

  test('anything but owner is Personal; single name and spaces', () => {
    const user = toSessionUser({
      name: '  cajero ',
      email: 'c@x.co',
      role: 'staff',
    })
    expect(user.role).toBe('staff')
    expect(user.roleLabel).toBe('Personal')
    expect(user.initials).toBe('C')
  })

  test('a store customer is labeled Cliente', () => {
    const user = toSessionUser({
      name: 'Abarrotes Luna',
      email: 'l@x.co',
      role: 'customer',
    })
    expect(user.role).toBe('customer')
    expect(user.roleLabel).toBe('Cliente')
  })

  test('uses the first two words only', () => {
    expect(
      toSessionUser({ name: 'Ana Maria Lopez', email: 'a@x.co', role: 'staff' })
        .initials,
    ).toBe('AM')
  })
})

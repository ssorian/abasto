import { describe, expect, test } from 'bun:test'
import { renameWarning } from '#/modules/riders/lib/rider-copy'

describe('rider rename warning', () => {
  test('says the name changes on past deliveries too', () => {
    expect(renameWarning('Luis')).toBe(
      'El nombre también cambia en los repartos anteriores de Luis, incluidos los ya liquidados.',
    )
  })
})

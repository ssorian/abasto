import { describe, expect, test } from 'bun:test'
import { primaryNav, secondaryNav } from '#/config/navigation'

const ownerOnlyPaths = () =>
  [...primaryNav, ...secondaryNav]
    .filter((item) => item.ownerOnly)
    .map((item) => item.to)

describe('navigation', () => {
  test('Almacenes is shown only to the owner', () => {
    expect(ownerOnlyPaths()).toContain('/almacenes')
  })

  test('Configuración stays owner-only and the daily pages stay open to staff', () => {
    expect(ownerOnlyPaths()).toEqual(['/almacenes', '/configuracion'])
  })
})

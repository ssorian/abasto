import { describe, expect, test } from 'bun:test'
import {
  accessText,
  storeAccessProblems,
} from '#/modules/customers/lib/store-access-text'

describe('accessText', () => {
  test('is the message the owner sends to the customer', () => {
    expect(accessText('ana@tienda.mx', 'Xk7mQ2pw')).toBe(
      'Acceso a la tienda\nCorreo: ana@tienda.mx\nContraseña: Xk7mQ2pw',
    )
  })
})

describe('storeAccessProblems', () => {
  test('grant asks for a valid email and a password, in Spanish', () => {
    expect(storeAccessProblems({ email: '', password: '' }, true)).toEqual([
      'Escribe un correo válido.',
      'Escribe la contraseña (mínimo 8 caracteres).',
    ])
    expect(
      storeAccessProblems({ email: 'ana', password: 'abc' }, true),
    ).toEqual([
      'Escribe un correo válido.',
      'La contraseña debe tener al menos 8 caracteres.',
    ])
    expect(
      storeAccessProblems(
        { email: ' ana@tienda.mx ', password: 'abcdefgh' },
        true,
      ),
    ).toEqual([])
  })

  test('changing the password does not ask for an email', () => {
    expect(storeAccessProblems({ email: '', password: '' }, false)).toEqual([
      'Escribe la contraseña (mínimo 8 caracteres).',
    ])
    expect(
      storeAccessProblems({ email: '', password: 'abcdefgh' }, false),
    ).toEqual([])
  })
})

import { describe, expect, test } from 'bun:test'

import { decideRouteAccess, isStorePath } from './route-access'

const roles = [null, 'staff', 'owner', 'customer'] as const

describe('isStorePath', () => {
  test('matches the store and its children only', () => {
    expect(isStorePath('/tienda')).toBe(true)
    expect(isStorePath('/tienda/entrar')).toBe(true)
    expect(isStorePath('/tienda/pedidos')).toBe(true)
    expect(isStorePath('/tiendas')).toBe(false)
    expect(isStorePath('/')).toBe(false)
    expect(isStorePath('/clientes/tienda')).toBe(false)
  })
})

describe('decideRouteAccess', () => {
  test('anonymous on a staff page goes to login keeping the target', () => {
    expect(decideRouteAccess(null, '/clientes')).toEqual({
      kind: 'redirect',
      to: '/login',
      keepTarget: true,
    })
  })

  test('staff and owner use staff pages', () => {
    expect(decideRouteAccess('staff', '/clientes')).toEqual({ kind: 'allow' })
    expect(decideRouteAccess('owner', '/')).toEqual({ kind: 'allow' })
  })

  test('a customer on any staff page is sent to the store', () => {
    for (const path of ['/', '/clientes', '/mostrador']) {
      expect(decideRouteAccess('customer', path)).toEqual({
        kind: 'redirect',
        to: '/tienda',
        keepTarget: false,
      })
    }
  })

  test('login: anonymous stays, signed-in users leave', () => {
    expect(decideRouteAccess(null, '/login')).toEqual({ kind: 'allow' })
    expect(decideRouteAccess('staff', '/login')).toEqual({
      kind: 'redirect',
      to: '/',
      keepTarget: false,
    })
    expect(decideRouteAccess('owner', '/login')).toEqual({
      kind: 'redirect',
      to: '/',
      keepTarget: false,
    })
    expect(decideRouteAccess('customer', '/login')).toEqual({
      kind: 'redirect',
      to: '/tienda',
      keepTarget: false,
    })
  })

  test('the store is public for every role', () => {
    for (const role of roles) {
      expect(decideRouteAccess(role, '/tienda')).toEqual({ kind: 'allow' })
      expect(decideRouteAccess(role, '/tienda/entrar')).toEqual({
        kind: 'allow',
      })
      expect(decideRouteAccess(role, '/tienda/pedidos')).toEqual({
        kind: 'allow',
      })
    }
  })
})

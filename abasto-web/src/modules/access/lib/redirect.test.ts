import { expect, test } from 'bun:test'
import { safeRedirect } from '#/modules/access/lib/redirect'

test('keeps internal paths, rejects everything else', () => {
  expect(safeRedirect('/almacenes')).toBe('/almacenes')
  expect(safeRedirect('/catalogo?x=1')).toBe('/catalogo?x=1')
  expect(safeRedirect('//evil.com')).toBe('/')
  expect(safeRedirect('https://evil.com')).toBe('/')
  expect(safeRedirect('/\\evil.com')).toBe('/')
  expect(safeRedirect('/login')).toBe('/')
  expect(safeRedirect(undefined)).toBe('/')
})

test('rejects paths with control characters or whitespace that browsers strip', () => {
  for (const value of [
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r//evil.com',
    '/ /evil.com',
    '/\x00x',
  ]) {
    expect(safeRedirect(value)).toBe('/')
  }
  expect(safeRedirect('/login?redirect=/x')).toBe('/')
  expect(safeRedirect('/almacenes?x=1')).toBe('/almacenes?x=1')
})
